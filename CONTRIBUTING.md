# Contributing

## Development Setup

```bash
git clone git@github.com:max-rousseau/har-analyser.git
cd har-analyser
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

## Testing

```bash
pytest
```

## Code Quality

No linter is configured yet. Ensure code compiles cleanly:

```bash
python -m py_compile src/har_analyser/app.py
python -m py_compile src/har_analyser/cli.py
```
