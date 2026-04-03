"""Command-line interface for the HAR analyzer."""

from pathlib import Path

import click

from har_analyser.app import HarAnalyserApp


@click.command()
@click.argument("har_file", type=click.Path(exists=True, path_type=Path))
def main(har_file: Path) -> None:
    """Analyze a HAR (HTTP Archive) file in an interactive TUI.

    HAR_FILE: Path to the .har file to analyze.
    """
    app = HarAnalyserApp(har_file)
    app.run()


if __name__ == "__main__":
    main()
