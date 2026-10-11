# Fieldnotes — Docker Compose Blog System

A small, responsive blog built with **Python, Flask, SQLAlchemy, and PostgreSQL**. Docker Compose starts the web application and its database as separate services, connects them on a private network, and keeps database files in a named volume.

## What you will build

- Browse a responsive homepage, open individual posts, and see a helpful empty state.
- Create, edit, and delete posts using server-validated forms with CSRF protection.
- Keep posts in PostgreSQL so they survive web-container restarts and rebuilds.
- Run the Flask web app and PostgreSQL database as separate Compose services.
- Run CRUD and validation tests with pytest.

## Project layout

```text
.
├── blog/
│   ├── __init__.py            # Flask application factory and database setup
│   ├── extensions.py          # Shared SQLAlchemy extension
│   ├── forms.py               # Validated, CSRF-protected forms
│   ├── models.py              # PostgreSQL-backed Post model
│   ├── routes.py              # Homepage, CRUD, and health-check routes
│   ├── static/style.css       # Responsive styling
│   └── templates/             # Homepage, forms, detail, and error pages
├── tests/                     # Automated CRUD and validation tests
├── screenshots/               # Checklist for screenshots to capture
├── Dockerfile                 # Builds the Flask application image
├── compose.yaml               # Web + database services, network, and volume
├── requirements.txt
├── .env.example               # Safe-to-copy local configuration template
├── .dockerignore
└── .gitignore
```

## Docker, in plain language

- **Image:** A packaged recipe/layer set for running software. The `Dockerfile` builds the web image; PostgreSQL uses the maintained official `postgres:17-alpine` image.
- **Container:** A running, isolated instance of an image. Compose runs one `web` container and one `db` container.
- **Port:** A doorway into a container. The web service publishes its port on `127.0.0.1:5000` by default so your browser can reach it. The database port is not published to your host.
- **Volume:** Storage managed by Docker, separate from a container's writable layer. The named `postgres_data` volume keeps database data when the database container is stopped, removed, or rebuilt.
- **Network:** A private connection between containers. The `web` service reaches PostgreSQL using the service name `db` over `blog_network`; this network is not exposed as a host port.
- **Docker Compose:** A tool that reads `compose.yaml` and operates the services, their network, health checks, and persistent volume together.

The database health check waits for PostgreSQL to accept connections. Compose starts `web` only after `db` is healthy, and the web service has its own database-aware health check.

## Start the application

1. Install Docker Desktop (or Docker Engine with the Compose plugin) and start it.
2. Open a terminal in this project directory.
3. Create your local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

4. Edit `.env` and replace both example secrets with strong local values. `.env` is ignored by Git; never commit it or use these sample values in production.
5. Build the application image and start both services:

   ```console
   docker compose up --build -d
   ```

6. Check service state:

   ```console
   docker compose ps
   ```

   Wait until `db` reports `healthy` and `web` reports `healthy` (the first build/start can take a little while).
7. Open **http://localhost:5000**. If you changed `WEB_PORT` in `.env`, use that port instead.
8. Select **Write a post**, enter a title and content, and choose **Save post**. The saved story opens on its own page and is also listed on the homepage.

## Useful Compose commands

```console
docker compose ps
docker compose logs -f web
docker compose logs -f db
docker compose down
docker compose up --build -d
```

- `docker compose ps` shows service/container status and health.
- `docker compose logs -f web` follows the application logs; press Ctrl+C to stop following logs (services keep running).
- `docker compose down` stops and removes the Compose containers and network. **It keeps the named `postgres_data` volume**, so your posts remain.
- `docker compose up --build -d` rebuilds the web image if needed and starts services in the background.

### Stop versus delete database data

`docker compose down` does **not** delete the named database volume. This is why posts survive a normal stop, container removal, and image rebuild. To intentionally erase all blog data, run:

```console
docker compose down --volumes
```

This permanently deletes the Compose-managed `postgres_data` volume. The next startup creates an empty database. Do not use `--volumes` when you want to preserve posts.

### Verify persistence

1. Create a post in the browser.
2. Run `docker compose down`.
3. Run `docker compose up -d`.
4. Open the homepage again; the post should still be there.

You can also check the volume exists with `docker volume ls` and inspect Compose's resolved configuration with `docker compose config` (avoid sharing its output if it includes your local credentials).

## Run tests without Docker

Tests use a temporary in-memory SQLite database so they do not need a running PostgreSQL server. From the project directory, create/activate a virtual environment if desired, install requirements, then run:

```console
python -m venv .venv
```

PowerShell activation:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install and run:

```console
python -m pip install -r requirements.txt
python -m pytest -q
```

The test suite checks the empty homepage, post creation and persistence, required-field validation, post detail and editing, deletion, and the friendly 404 page. SQLite is only a test database; Compose configures the running blog to use PostgreSQL.

## Sample outputs

After startup, `docker compose ps` should show both services running. The `db` service should become `healthy`; the `web` service becomes healthy after its `/healthz` endpoint successfully checks the database. Container IDs and build times will differ.

```text
NAME                         SERVICE   STATUS
docker-compose-blog-db-1     db        Up (healthy)
docker-compose-blog-web-1    web       Up (healthy)
```

Typical test output:

```text
......                                                                   [100%]
6 passed
```

These are examples, not claims that Docker or pytest have been run on your machine.

## Troubleshooting

- **Compose says `POSTGRES_PASSWORD` or `SECRET_KEY` is missing:** Copy `.env.example` to `.env` in the same folder as `compose.yaml` and fill in both values.
- **Port 5000 is already in use:** Set `WEB_PORT=5001` in `.env`, restart with `docker compose up -d`, and visit `http://localhost:5001`.
- **The web service is waiting or unhealthy:** Run `docker compose ps` and `docker compose logs db`, then `docker compose logs web`. Give PostgreSQL a few seconds on first startup; web startup is gated by its database health check.
- **A database password was changed after the first startup:** PostgreSQL keeps its initialized credentials in the volume. Changing `.env` alone does not change that database user's password. Restore the original value, or—only if it is safe to erase all posts—run `docker compose down --volumes` and start again.
- **The page cannot be reached:** Confirm Docker Desktop/Engine is running, check the published port in `docker compose ps`, and use the matching `WEB_PORT`.
- **Changes to Python dependencies are not reflected:** Rebuild the image with `docker compose up --build -d`.
- **Tests cannot import a dependency:** Activate the intended virtual environment and rerun `python -m pip install -r requirements.txt`.

## Security and deployment notes

The `.env.example` values are placeholders for local development, not production credentials. Configure unique secret values outside source control, protect `.env`, and use a production secret-management method when deploying. Compose intentionally does not publish PostgreSQL's port. For production, add a migration system, TLS/reverse proxy, backups, and deployment-specific hardening rather than relying on development defaults.

## Screenshots checklist

See [`screenshots/README.md`](screenshots/README.md) for the screenshot checklist and suggested filenames. Capture the running homepage, filled-in create form, saved post detail, and healthy Compose services. Keep credentials and `.env` contents out of screenshots.
