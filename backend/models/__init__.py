"""
Models package — importing all models here so that `import models`
registers every table with SQLAlchemy's Base.metadata.
"""

from models.user import User          # noqa: F401
from models.role import Role          # noqa: F401
from models.task import Task          # noqa: F401
from models.document import Document  # noqa: F401
from models.activity_log import ActivityLog  # noqa: F401
from models.application import StartupApplication  # noqa: F401
from models.application_draft import ApplicationDraft  # noqa: F401
