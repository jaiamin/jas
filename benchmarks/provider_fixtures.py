"""Explicit provider-wire encoding for keyless test/benchmark response fixtures.

Fixtures describe canonical saved actions. This only changes transport shape; it
never fixes non-null contradictory payloads or manufactures a model decision.
"""

from copy import deepcopy


def output_args(info, value):
    schema = info.output_tools[0].parameters_json_schema
    value = deepcopy(value)
    if not isinstance(value, dict):
        return value
    properties = schema.get("properties", {})
    if set(properties) == {"request"}:
        value = {"request": {key: item for key, item in value.items() if item is not None}}
    if "ContentEntry" not in schema.get("$defs", {}):
        return value

    def encode(item):
        if isinstance(item, dict):
            result = {key: encode(child) for key, child in item.items()}
            if result.get("kind") in {"write_artifact", "perform_work"} and isinstance(
                result.get("content"), dict
            ):
                result["content"] = [
                    {"key": key, "value": child} for key, child in result["content"].items()
                ]
            return result
        return [encode(child) for child in item] if isinstance(item, list) else item

    return encode(value)
