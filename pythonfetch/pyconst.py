#
# NetTrader 2
#
# @package NetTrader
# @license http://www.gnu.org/licenses/agpl.html AGPL Version 3
# @author Nicolas Fortin <nfortin@nettrader.fr>

import os

C_HOST = os.environ.get("DB_HOST", "localhost")
C_USER = os.environ.get("DB_USER", "database user")
C_PWD = os.environ.get("DB_PASSWORD", "database password")
C_DBNAME = os.environ.get("DB_NAME", "database name")

CAPDEB = os.environ.get("CAPDEB", "10000")
URLINDEX = os.environ.get("URLINDEX", "http://www.nettrader.fr/")

