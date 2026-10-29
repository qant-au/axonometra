"""Create the publisher key and sign furniture packs for Axonometra.

    python tools/fp3dpack.py keygen KEYFILE
        Creates a new signing key (keep it secret, never commit it) and prints the public key line
        for PACK_PUBLIC_KEYS in custom_components/axonometra/packs.py.

    python tools/fp3dpack.py sign SOURCE.json --key KEYFILE [--licensee "Name"] [--out PACK.fp3dpack]
    python tools/fp3dpack.py canonical SOURCE.json [--out PACK.canonical.json]   (template for the shop)
    python tools/fp3dpack.py seed KEYFILE                                        (seed for the shop server)
        Checks the pack source (the payload, see packs.py) and writes the signed pack. With
        --licensee the buyer's name is signed into the pack and shown when it is imported.

    python tools/fp3dpack.py verify PACK.fp3dpack
        Checks a pack against the keys in packs.py, as Home Assistant does on import.

Needs the packages "cryptography" and "voluptuous".
"""

from __future__ import annotations

import argparse
import base64
import importlib.util
import json
from pathlib import Path
import sys

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

ROOT = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location("fp3d_packs", ROOT / "custom_components" / "axonometra" / "packs.py")
assert _spec and _spec.loader
packs = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(packs)


def _raw_public(private: Ed25519PrivateKey) -> bytes:
    return private.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)


def keygen(path: Path) -> None:
    if path.exists():
        sys.exit(f"{path} exists already - a new key would make it impossible to sign updates of old packs")
    path.parent.mkdir(parents=True, exist_ok=True)
    private = Ed25519PrivateKey.generate()
    path.write_bytes(
        private.private_bytes(
            serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()
        )
    )
    raw = _raw_public(private)
    print(f"Signing key written to {path} - keep a backup, never share or commit it.")
    print("Public key for PACK_PUBLIC_KEYS in packs.py:")
    print(f'    "{packs.key_id(raw)}": "{base64.b64encode(raw).decode()}",')


def sign(source: Path, key: Path, licensee: str | None, out: Path | None, instance: str | None = None) -> None:
    payload = json.loads(source.read_text(encoding="utf-8"))
    # the licensee is always present, so a shop can put a buyer's name into the canonical form later
    payload["licensee"] = licensee
    # a pack bound to one installation (its fingerprint, shown in Axonometra under the shop connection)
    payload["instance"] = instance
    packs.validate_payload(payload)
    private = serialization.load_pem_private_key(key.read_bytes(), password=None)
    if not isinstance(private, Ed25519PrivateKey):
        sys.exit("not an Ed25519 key")
    signature = {
        "key": packs.key_id(_raw_public(private)),
        "sig": base64.b64encode(private.sign(packs.canonical(payload))).decode(),
    }
    target = out or source.with_suffix(".fp3dpack")
    target.write_text(
        json.dumps({"payload": payload, "signature": signature}, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    print(f"Signed {len(payload['items'])} items -> {target}")


def canonical(source: Path, out: Path | None) -> None:
    """Write the canonical bytes of a pack without a licensee: the template a shop signs per buyer
    (see tools/shop/ms-np-sign.php), which replaces the last "licensee":null with the buyer's name."""
    payload = json.loads(source.read_text(encoding="utf-8"))
    payload["licensee"] = None
    # the shop replaces the last "instance":null with the buyer's installation fingerprint
    payload["instance"] = None
    payload.setdefault("release", 1)
    packs.validate_payload(payload)
    target = out or source.with_suffix(".canonical.json")
    target.write_bytes(packs.canonical(payload))
    print(f"Canonical template -> {target}")


def seed(key: Path) -> None:
    """Print the 32-byte seed of a key (base64) for a server that signs with PHP sodium."""
    private = serialization.load_pem_private_key(key.read_bytes(), password=None)
    if not isinstance(private, Ed25519PrivateKey):
        sys.exit("not an Ed25519 key")
    raw = private.private_bytes(
        serialization.Encoding.Raw, serialization.PrivateFormat.Raw, serialization.NoEncryption()
    )
    print(base64.b64encode(raw).decode())


def verify(path: Path) -> None:
    try:
        payload = packs.verify_pack(path.read_text(encoding="utf-8"))
    except packs.PackError as err:
        sys.exit(f"invalid: {err}")
    print(
        f"ok: {payload['name']} by {payload['publisher']}, {len(payload['items'])} items"
        + (f", for {payload['licensee']}" if payload["licensee"] else "")
        + f", release {payload['release']}"
        + (f", bound to installation {payload['instance']}" if payload["instance"] else "")
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("keygen")
    p.add_argument("keyfile", type=Path)
    p = sub.add_parser("sign")
    p.add_argument("source", type=Path)
    p.add_argument("--key", type=Path, required=True)
    p.add_argument("--licensee")
    p.add_argument("--instance", help="bind the pack to one installation (its 16-character fingerprint)")
    p.add_argument("--out", type=Path)
    p = sub.add_parser("verify")
    p.add_argument("pack", type=Path)
    p = sub.add_parser("canonical")
    p.add_argument("source", type=Path)
    p.add_argument("--out", type=Path)
    p = sub.add_parser("seed")
    p.add_argument("keyfile", type=Path)
    args = parser.parse_args()
    if args.command == "keygen":
        keygen(args.keyfile)
    elif args.command == "sign":
        sign(args.source, args.key, args.licensee, args.out, args.instance)
    elif args.command == "canonical":
        canonical(args.source, args.out)
    elif args.command == "seed":
        seed(args.keyfile)
    else:
        verify(args.pack)


if __name__ == "__main__":
    main()
