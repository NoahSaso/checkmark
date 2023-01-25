# cw-checkmark

This contract manages a one-to-one mapping between checkmark IDs and assigned
addresses. One address can be assigned one checkmark at a time, and one
checkmark can be assigned to one address.

Checkmark IDs can be banned. Banned checkmark IDs cannot be assigned to any
address.

There is one assigner. The assigner can assign checkmarks.

There is zero or one owner. The owner can:

- assign checkmarks
- revoke a checkmark by checkmark ID
- revoke a checkmark by assigned address
- ban a checkmark by checkmark ID
- unban a checkmark by checkmark ID
- update the assigner
- update the owner
