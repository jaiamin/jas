"""Self-contained, lossless JSON references for repeated evidence values."""

import hashlib
import json
from collections import Counter


def share_json(data: dict) -> dict:
    """Share exact repeated values on the wire; retain the original frozen evidence."""
    counts: Counter[str] = Counter()
    field_names: set[str] = set()

    def key(value):
        if isinstance(value, (dict, list, str)):
            encoded = json.dumps(value, sort_keys=True)
            if len(encoded) >= 160:
                return hashlib.sha256(encoded.encode()).hexdigest()
        return None

    def collect(value):
        if isinstance(value, dict):
            field_names.update(value)
        if (identifier := key(value)) is not None:
            counts[identifier] += 1
        for child in (
            value.values() if isinstance(value, dict) else value if isinstance(value, list) else []
        ):
            collect(child)

    shared, identifiers = {}, {}

    def body(value):
        if isinstance(value, dict):
            return {name: project(child) for name, child in value.items()}
        if isinstance(value, list):
            return [project(child) for child in value]
        return value

    def project(value):
        identifier = key(value)
        if identifier is not None and counts[identifier] > 1:
            if identifier not in identifiers:
                identifiers[identifier] = str(len(identifiers))
                shared[identifiers[identifier]] = body(value)
            return {reference_key: identifiers[identifier]}
        return body(value)

    collect(data)
    reference_key = "$jas"
    while reference_key in field_names:
        reference_key += "_"
    return {
        **project(data),
        "reference_key": reference_key,
        "shared_values": shared,
    }
