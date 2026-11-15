# Distinguish token limits from dollar limits

Supporting arbitrary models means some endpoints have no known token price.
The user accepted explicit token-capped execution with USD cost marked unknown
for those models; dollar-only execution must reject an unpriced model until the
user supplies rates. Inventing a price or reporting unknown spending as zero
would misrepresent the guarantee, so a token cap never claims to enforce a dollar
maximum. Priced requests retain atomic USD reservations and historical rate
snapshots; token reservations must also settle or remain visibly unresolved.
