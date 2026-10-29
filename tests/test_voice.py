"""Assist asks the house: service, intent, sentences and the views' answers."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

from homeassistant.core import HomeAssistant
from homeassistant.helpers import intent

from custom_components.axonometra.const import DOMAIN
from custom_components.axonometra.voice import remove_sentences, sentences_yaml, write_sentences

from .test_init import _setup


async def _view(hass_ws_client, hass: HomeAssistant):
    """An open Axonometra view: subscribed to the sentences."""
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "axonometra/voice/subscribe"})
    assert (await client.receive_json())["success"]
    return client


async def test_service_hands_the_sentence_to_the_views_and_returns_the_first_answer(
    hass: HomeAssistant, hass_ws_client
) -> None:
    await _setup(hass)
    view = await _view(hass_ws_client, hass)
    other = await _view(hass_ws_client, hass)

    task = hass.async_create_task(
        hass.services.async_call(
            DOMAIN, "ask", {"text": "Zeig das Wohnzimmer", "speak": True}, blocking=True, return_response=True
        )
    )
    ask = (await view.receive_json())["event"]
    assert ask["text"] == "Zeig das Wohnzimmer"
    assert ask["speak"] is True
    assert ask["screen"] is None
    assert (await other.receive_json())["event"]["ask_id"] == ask["ask_id"]

    await view.send_json(
        {"id": 2, "type": "axonometra/voice/answer", "ask_id": ask["ask_id"], "text": "Ich zeige das Wohnzimmer."}
    )
    assert (await view.receive_json())["result"] == {"taken": True}
    # the second view is late
    await other.send_json({"id": 2, "type": "axonometra/voice/answer", "ask_id": ask["ask_id"], "text": "Wohnzimmer"})
    assert (await other.receive_json())["result"] == {"taken": False}

    assert await task == {"answered": True, "answer": "Ich zeige das Wohnzimmer.", "screen_open": True}


async def test_service_without_an_open_view_says_so(hass: HomeAssistant) -> None:
    await _setup(hass)
    with patch("custom_components.axonometra.voice.ANSWER_TIMEOUT", 0.05):
        result = await hass.services.async_call(
            DOMAIN, "ask", {"text": "Zeig die Küche", "screen": "Flur"}, blocking=True, return_response=True
        )
    assert result == {"answered": False, "answer": "", "screen_open": False}


async def test_intent_speaks_the_answer_or_that_nothing_was_understood(hass: HomeAssistant, hass_ws_client) -> None:
    await _setup(hass)
    view = await _view(hass_ws_client, hass)

    ids = iter(range(10, 100))

    async def answer(text: str, answered: bool) -> intent.IntentResponse:
        task = hass.async_create_task(
            intent.async_handle(
                hass, "test", "AxonometraAsk", {"text": {"value": text}}, text_input=text, language="de"
            )
        )
        ask = (await view.receive_json())["event"]
        assert ask["text"] == text
        await view.send_json(
            {
                "id": next(ids),
                "type": "axonometra/voice/answer",
                "ask_id": ask["ask_id"],
                "text": "Drei Fenster sind offen.",
                "answered": answered,
            }
        )
        await view.receive_json()
        return await task

    assert (await answer("Was ist offen", True)).speech["plain"]["speech"] == "Drei Fenster sind offen."
    assert (await answer("Blubb", False)).speech["plain"]["speech"] == "Das hat Axonometra nicht verstanden."


async def test_intent_without_a_view(hass: HomeAssistant) -> None:
    await _setup(hass)
    with patch("custom_components.axonometra.voice.ANSWER_TIMEOUT", 0.05):
        response = await intent.async_handle(
            hass, "test", "AxonometraAsk", {"text": {"value": "living room"}}, language="en"
        )
    assert response.speech["plain"]["speech"] == "No Axonometra screen is open right now."


def test_sentences_are_written_only_on_request_and_never_over_a_changed_file(tmp_path: Path) -> None:
    de = tmp_path / "custom_sentences" / "de" / "axonometra.yaml"
    en = tmp_path / "custom_sentences" / "en" / "axonometra.yaml"
    hashes, kept, changed = write_sentences(tmp_path, "distinct", {})
    assert changed and kept == []
    text = de.read_text(encoding="utf-8")
    assert text == sentences_yaml("de", "distinct")
    assert "zeig[e] [mir] [mal] [bitte] {text}" in text
    # only the distinct sentences: a question Home Assistant answers itself is not taken (#641)
    assert "welche (fenster|türen) sind [noch] offen" not in text
    assert en.is_file()
    # unchanged: nothing written
    hashes, kept, changed = write_sentences(tmp_path, "distinct", hashes)
    assert not changed
    # "all" adds the questions
    hashes, kept, changed = write_sentences(tmp_path, "all", hashes)
    assert changed and "welche (fenster|türen) sind [noch] offen" in de.read_text(encoding="utf-8")
    # a file the user changed is never overwritten, nor removed
    de.write_text("my own sentences", encoding="utf-8")
    hashes, kept, changed = write_sentences(tmp_path, "distinct", hashes)
    assert kept == ["de"]
    assert de.read_text(encoding="utf-8") == "my own sentences"
    hashes, kept, _ = write_sentences(tmp_path, "off", hashes)
    assert kept == ["de"] and de.exists() and not en.exists()
    # removing the integration takes only Axonometra's own files
    hashes, _, _ = write_sentences(tmp_path, "distinct", hashes)
    remove_sentences(tmp_path, hashes)
    assert not en.exists()
    assert de.read_text(encoding="utf-8") == "my own sentences"


def test_a_file_an_older_version_wrote_is_still_ours(tmp_path: Path) -> None:
    """Files from 1.22.0 - 1.24.0 (older header lines) are replaced, not kept as the user's own."""
    de = tmp_path / "custom_sentences" / "de" / "axonometra.yaml"
    de.parent.mkdir(parents=True)
    de.write_text(
        sentences_yaml("de", "distinct").replace(
            "# understands answers). Put your own sentences for AxonometraAsk into another file.\n",
            "# understands answers). Rewritten on every start: "
            "put your own sentences for AxonometraAsk into another file.\n",
        ),
        encoding="utf-8",
    )
    _, kept, changed = write_sentences(tmp_path, "distinct", {})
    assert kept == [] and changed
    assert de.read_text(encoding="utf-8") == sentences_yaml("de", "distinct")


async def test_setup_writes_no_sentence_file(hass: HomeAssistant) -> None:
    """Nothing lands in the configuration folder unless an admin picks the sentences (HACS review)."""
    await _setup(hass)
    assert not (Path(hass.config.config_dir) / "custom_sentences").exists()


async def test_unload_removes_service_and_intent(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    assert hass.services.has_service(DOMAIN, "ask")
    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    assert not hass.services.has_service(DOMAIN, "ask")


# a file an early version wrote with its own, shorter set of sentences (seen on a real installation)
_EARLY_FILE = """# Written by Axonometra: the sentences Assist hands to the open Axonometra views (the first one that
# understands answers). Rewritten on every start: put your own sentences for AxonometraAsk into another file.
language: "de"
intents:
  AxonometraAsk:
    data:
      - sentences:
          - "zeig[e] [mir] [mal] [bitte] {text}"
          - "wo (ist|sind|steht|stehen) {text}"
          - "gute nacht"
lists:
  text:
    wildcard: true
"""


def test_an_early_file_with_other_sentences_is_still_ours(tmp_path: Path) -> None:
    """Only Axonometra's sentences under Axonometra's header: replaced (it lacked "wer ist zu hause"); one sentence of
    the user's own in it, and it stays."""
    de = tmp_path / "custom_sentences" / "de" / "axonometra.yaml"
    de.parent.mkdir(parents=True)
    de.write_text(_EARLY_FILE, encoding="utf-8")
    _, kept, changed = write_sentences(tmp_path, "distinct", {})
    assert kept == [] and changed
    assert "wer ist [gerade] (zu hause|zuhause|daheim)" in de.read_text(encoding="utf-8")
    de.write_text(
        _EARLY_FILE.replace('          - "gute nacht"\n', '          - "mach das licht aus"\n'), encoding="utf-8"
    )
    _, kept, _ = write_sentences(tmp_path, "distinct", {})
    assert kept == ["de"]


def test_the_names_locating_knows_are_a_list_not_a_wildcard(tmp_path: Path) -> None:
    """ "Wo ist Frauke?" matches a list of names exactly, so Assist handles it locally and an AI agent behind it
    never gets the question."""
    de = tmp_path / "custom_sentences" / "de" / "axonometra.yaml"
    hashes, _, _ = write_sentences(tmp_path, "distinct", {}, ["Torsten Apple Watch", "Torsten", 'Frau "K"'])
    text = de.read_text(encoding="utf-8")
    assert "wo (ist|steckt|sind) [der|die|das|mein|meine] {axonometra_who}" in text
    assert '      - "Torsten Apple Watch"' in text and '      - "Frau \\"K\\""' in text
    # the names change: the file follows; no names: the list goes
    _, _, changed = write_sentences(tmp_path, "distinct", hashes, ["Torsten"])
    assert changed and "Apple Watch" not in de.read_text(encoding="utf-8")
    write_sentences(tmp_path, "distinct", {}, [])
    assert "axonometra_who" not in de.read_text(encoding="utf-8")


def test_an_older_file_with_fewer_sentences_is_still_ours(tmp_path: Path) -> None:
    """A file of an older version had fewer sentences (no "wer ist zu hause"): replaced, not kept as the user's."""
    de = tmp_path / "custom_sentences" / "de" / "axonometra.yaml"
    de.parent.mkdir(parents=True)
    de.write_text(
        "# Written by Axonometra: the sentences Assist hands to the open Axonometra views (the first one that\n"
        "# understands answers). Rewritten on every start: put your own sentences for AxonometraAsk "
        "into another file.\n"
        'language: "de"\nintents:\n  AxonometraAsk:\n    data:\n      - sentences:\n'
        '          - "zeig[e] [mir] [mal] [bitte] {text}"\n          - "wo (ist|sind|steht|stehen) {text}"\n'
        "lists:\n  text:\n    wildcard: true\n",
        encoding="utf-8",
    )
    _, kept, changed = write_sentences(tmp_path, "distinct", {})
    assert kept == [] and changed
    # one sentence of the user's own in it: kept
    de.write_text(
        de.read_text(encoding="utf-8")
        .replace("wildcard: true", "wildcard: true\n")
        .replace('          - "zeig', '          - "mach das licht an"\n          - "zeig'),
        encoding="utf-8",
    )
    _, kept, _ = write_sentences(tmp_path, "distinct", {})
    assert kept == ["de"]


def test_the_names_locating_knows_are_sentences(tmp_path: Path) -> None:
    """ "Wo ist Frauke?" as a list of names (no wildcard): Assist matches it locally even with an AI agent."""
    de = tmp_path / "custom_sentences" / "de" / "axonometra.yaml"
    hashes, _, _ = write_sentences(tmp_path, "distinct", {}, ["Frauke", "Torstens iPhone"])
    text = de.read_text(encoding="utf-8")
    assert "{axonometra_who}" in text and '      - "Torstens iPhone"' in text
    # names changed: the file is ours, so it is rewritten
    _, kept, changed = write_sentences(tmp_path, "distinct", hashes, ["Frauke"])
    assert kept == [] and changed and "Torstens iPhone" not in de.read_text(encoding="utf-8")
