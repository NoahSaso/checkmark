# cw-checkmark

This contract manages a one-to-one mapping between checkmark IDs and wallet addresses. One wallet
can be assigned one checkmark at a time, and one checkmark can be assigned to
one wallet.

Checkmark IDs can be banned. Banned checkmark IDs cannot be assigned to any
wallet.

There is one assigner. The assigner can assign checkmarks.

There is one admin. The admin can:

- assign checkmarks
- revoke a checkmark by checkmark ID
- revoke a checkmark by wallet
- ban a checkmark by checkmark ID
- unban a checkmark by checkmark ID
- update the assigner
- update the admin
