import logging
import traceback

logger = logging.getLogger(__name__)


def log_failure(context: str, error: BaseException) -> None:
    # Retain stack locations without provider exception text, request bodies or local values.
    logger.error(
        "%s (%s)\n%s",
        context,
        type(error).__name__,
        "".join(traceback.format_tb(error.__traceback__)),
    )
