"""The upstream author's online services, switched off in Axonometra.

NeonPlan 3D connects to its author's servers at mastershort.de: the shop and licence keys, the pack
catalogue and pack downloads, offers and the newsletter, and opt-in usage reports. Axonometra keeps all
of that code, maintained and covered by upstream's tests, but sends nothing while this is False, so
nothing in Axonometra depends on systems it does not run.

Turning it on is a decision to take with the author, not a setting: see fork/README.md.
"""

UPSTREAM_SERVICES = False
