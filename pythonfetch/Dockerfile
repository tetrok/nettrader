FROM python:3.9-slim

ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies if required (e.g. for some pip packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install required python packages
RUN pip install --no-cache-dir pymysql yfinance cryptography

# Copy all python files
COPY . /app/

# The entrypoint will be defined in docker-compose.yml to run the specific script
