from sqlalchemy import event
from sqlalchemy.engine import Engine
import time
import logging

logger = logging.getLogger("optimate.app.debug")
# logger.setLevel(logging.DEBUG)
logger.setLevel(logging.ERROR)

# Log slow queries
# @event.listens_for(Engine, "before_cursor_execute")
# def before_cursor_execute(conn, cursor, statement,
#                         parameters, context, executemany):
#     conn.info.setdefault('query_start_time', []).append(time.time())

# @event.listens_for(Engine, "after_cursor_execute")
# def after_cursor_execute(conn, cursor, statement,
#                         parameters, context, executemany):
#     total = time.time() - conn.info['query_start_time'].pop(-1)
#     if total > 0.01:
#         logger.debug("Time: %f, Query: %s", total, statement)
