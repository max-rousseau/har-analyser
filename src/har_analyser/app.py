"""Textual TUI application for HAR file analysis."""

import json
from pathlib import Path
from urllib.parse import urlparse

from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import VerticalScroll
from textual.screen import ModalScreen
from textual.widgets import Footer, Header, Label, ListItem, ListView, Static


class EntryDetailScreen(ModalScreen[None]):
    """Screen showing detailed view of a single HAR entry."""

    BINDINGS = [
        Binding("escape", "dismiss", "Back"),
        Binding("enter", "dismiss", "Back", show=False),
        Binding("q", "dismiss", "Back"),
    ]

    DEFAULT_CSS = """
    EntryDetailScreen {
        align: center middle;
    }

    EntryDetailScreen > VerticalScroll {
        width: 90%;
        height: 90%;
        border: thick $accent;
        background: $surface;
        padding: 1 2;
    }

    EntryDetailScreen .section-header {
        color: $accent;
        text-style: bold;
        margin-top: 1;
    }

    EntryDetailScreen .key-value {
        margin-left: 2;
    }

    EntryDetailScreen .content-text {
        margin-left: 2;
        color: $text-muted;
    }
    """

    def __init__(self, entry: dict, index: int) -> None:
        super().__init__()
        self.entry = entry
        self.index = index

    def compose(self) -> ComposeResult:
        with VerticalScroll():
            yield Static(self._format_entry(), markup=False)

    def _format_entry(self) -> str:
        """Format HAR entry for human-readable display."""
        entry = self.entry
        request = entry["request"]
        response = entry["response"]
        timings = entry.get("timings", {})

        lines = [
            f"═══ Entry #{self.index + 1} ═══",
            "",
            "── REQUEST ──",
            f"  Method:       {request['method']}",
            f"  URL:          {request['url']}",
            f"  HTTP Version: {request['httpVersion']}",
        ]

        if request.get("queryString"):
            lines.append("")
            lines.append("  Query Parameters:")
            for param in request["queryString"]:
                lines.append(f"    {param['name']}: {param['value']}")

        if request.get("headers"):
            lines.append("")
            lines.append("  Headers:")
            for header in request["headers"]:
                value = (
                    "(See Cookies below)"
                    if header["name"].lower() == "cookie"
                    else header["value"]
                )
                lines.append(f"    {header['name']}: {value}")

        if request.get("cookies"):
            lines.append("")
            lines.append("  Cookies:")
            for cookie in request["cookies"]:
                lines.append(f"    {cookie['name']}: {cookie['value']}")

        if post_data := request.get("postData"):
            lines.append("")
            lines.append("  Post Data:")
            lines.append(f"    MIME Type: {post_data.get('mimeType', 'N/A')}")
            if text := post_data.get("text"):
                lines.append("    Body:")
                lines.append(self._format_body(text, post_data.get("mimeType", "")))

        lines.extend(
            [
                "",
                "── RESPONSE ──",
                f"  Status:       {response['status']} {response['statusText']}",
                f"  HTTP Version: {response['httpVersion']}",
            ]
        )

        if response.get("headers"):
            lines.append("")
            lines.append("  Headers:")
            for header in response["headers"]:
                value = (
                    "(See Cookies below)"
                    if header["name"].lower() == "set-cookie"
                    else header["value"]
                )
                lines.append(f"    {header['name']}: {value}")

        if response.get("cookies"):
            lines.append("")
            lines.append("  Cookies:")
            for cookie in response["cookies"]:
                lines.append(f"    {cookie['name']}: {cookie['value']}")

        if content := response.get("content"):
            lines.append("")
            lines.append("  Content:")
            lines.append(f"    Size:      {content.get('size', 0)} bytes")
            lines.append(f"    MIME Type: {content.get('mimeType', 'N/A')}")
            if text := content.get("text"):
                lines.append("    Body:")
                lines.append(self._format_body(text, content.get("mimeType", "")))

        lines.extend(
            [
                "",
                "── TIMINGS (ms) ──",
                f"  Total:    {entry.get('time', -1):.2f}",
                f"  Blocked:  {timings.get('blocked', -1)}",
                f"  DNS:      {timings.get('dns', -1)}",
                f"  Connect:  {timings.get('connect', -1)}",
                f"  SSL:      {timings.get('ssl', -1)}",
                f"  Send:     {timings.get('send', -1)}",
                f"  Wait:     {timings.get('wait', -1)}",
                f"  Receive:  {timings.get('receive', -1)}",
            ]
        )

        if server_ip := entry.get("serverIPAddress"):
            lines.append("")
            lines.append(f"  Server IP: {server_ip}")

        return "\n".join(lines)

    def _format_body(self, text: str, mime_type: str) -> str:
        """Format body content with indentation, attempting JSON pretty-print."""
        max_length = 5000
        original_length = len(text)
        if original_length > max_length:
            text = text[:max_length]

        if "json" in mime_type.lower():
            try:
                parsed = json.loads(text)
                text = json.dumps(parsed, indent=2)
            except json.JSONDecodeError:
                pass

        indented = "\n".join(f"      {line}" for line in text.split("\n"))
        if original_length > max_length:
            indented += f"\n      ... (truncated, {original_length} total bytes)"
        return indented


class HarAnalyserApp(App[None]):
    """TUI application for analyzing HAR files."""

    TITLE = "HAR Analyser"

    BINDINGS = [
        Binding("q", "quit", "Quit"),
        Binding("s", "toggle_session_view", "Session View"),
        Binding("f", "toggle_filter_mode", "Filter"),
        Binding("m", "filter_by_method", "Method", show=False),
        Binding("d", "filter_by_domain", "Domain", show=False),
        Binding("p", "filter_by_path", "Path", show=False),
        Binding("i", "filter_by_session", "Session", show=False),
        Binding("enter", "select_entry", "View Details", show=False),
        Binding("v", "invert_filter", "Invert Filter", show=False),
        Binding("backspace", "delete_entry", "Delete", show=False),
        Binding("delete", "delete_entry", "Delete", show=False),
    ]

    SESSION_COLORS = [
        "#ff6b6b",  # red
        "#4ecdc4",  # teal
        "#ffe66d",  # yellow
        "#95e1d3",  # mint
        "#dda0dd",  # plum
        "#87ceeb",  # sky blue
        "#f0e68c",  # khaki
        "#98d8c8",  # seafoam
        "#ffb347",  # orange
        "#b19cd9",  # lavender
    ]

    DEFAULT_CSS = """
    #entry-list {
        height: 1fr;
    }

    #entry-list > ListItem {
        padding: 0 1;
    }

    #entry-list > ListItem.--highlight {
        background: $accent;
    }

    .entry-label {
        width: 100%;
    }

    .method-get {
        color: $success;
    }

    .method-post {
        color: $warning;
    }

    .method-delete {
        color: $error;
    }

    .method-put {
        color: #ff8800;
    }

    .method-patch {
        color: #aa88ff;
    }

    .status-2xx {
        color: $success;
    }

    .status-3xx {
        color: #00aaff;
    }

    .status-4xx {
        color: $warning;
    }

    .status-5xx {
        color: $error;
    }

    #status-bar {
        height: 1;
        background: $accent;
        color: $text;
        padding: 0 1;
        width: 100%;
    }

    #column-header {
        height: 1;
        background: $surface;
        color: $text;
        text-style: bold;
        padding: 0 2;
    }
    """

    def __init__(self, har_path: Path) -> None:
        super().__init__()
        self.har_path = har_path
        self._load_har_file()
        self.session_cookie_names = self._find_session_cookies()
        self.session_view = False
        self.session_color_map = self._build_session_color_map()
        self.filter_mode = False
        self.active_filter: dict | None = None
        self.filtered_indices: list[int] | None = None
        self.deleted_indices: set[int] = set()

    def _load_har_file(self) -> None:
        """Load and parse the HAR file."""
        with open(self.har_path, encoding="utf-8") as f:
            self.har_data: dict = json.load(f)
        self.entries: list[dict] = self.har_data["log"]["entries"]

    def _find_session_cookies(self) -> list[str]:
        """Find all unique cookie names containing 'session' across all entries."""
        session_cookies: set[str] = set()
        for entry in self.entries:
            for cookie in entry["request"].get("cookies", []):
                if "session" in cookie["name"].lower():
                    session_cookies.add(cookie["name"])
        return sorted(session_cookies)

    def _build_session_color_map(self) -> dict[str, str]:
        """Build a mapping of unique session values to colors."""
        unique_sessions: set[str] = set()
        for entry in self.entries:
            session_key = self._get_session_key(entry)
            if session_key:
                unique_sessions.add(session_key)

        color_map = {}
        for i, session in enumerate(sorted(unique_sessions)):
            color_map[session] = self.SESSION_COLORS[i % len(self.SESSION_COLORS)]
        return color_map

    def _get_session_key(self, entry: dict) -> str | None:
        """Get the session key for an entry (first session cookie value found)."""
        cookies = {c["name"]: c["value"] for c in entry["request"].get("cookies", [])}
        for cookie_name in self.session_cookie_names:
            if value := cookies.get(cookie_name):
                return f"{cookie_name}:{value}"
        return None

    def compose(self) -> ComposeResult:
        yield Header()
        yield Static(self._build_header_text(), id="column-header")
        yield ListView(id="entry-list")
        yield Static("Loading...", id="status-bar")
        yield Footer()

    def _build_header_text(self) -> str:
        """Build the column header text with session cookie columns."""
        header = f"{'METHOD':<7} {'STS':<3} {'DOMAIN':<30} {'PATH':<40} "
        for cookie_name in self.session_cookie_names:
            display_name = cookie_name[:15] if len(cookie_name) > 15 else cookie_name
            header += f"{display_name:<17} "
        return header.rstrip()

    def on_mount(self) -> None:
        """Populate list on mount."""
        self._populate_list()
        self._update_status_bar()

    def _populate_list(self) -> None:
        """Populate the ListView with HAR entries."""
        list_view = self.query_one("#entry-list", ListView)
        list_view.clear()

        indices = (
            self.filtered_indices
            if self.filtered_indices is not None
            else range(len(self.entries))
        )
        indices = [i for i in indices if i not in self.deleted_indices]

        for i in indices:
            entry = self.entries[i]
            request = entry["request"]
            response = entry["response"]

            method = request["method"]
            url = request["url"]
            status = response["status"]

            parsed_url = urlparse(url)
            domain = parsed_url.netloc
            if len(domain) > 30:
                domain = domain[:27] + "..."

            short_path = parsed_url.path
            if parsed_url.query:
                short_path += "?" + parsed_url.query
            if len(short_path) > 40:
                short_path = "..." + short_path[-37:]

            method_class = f"method-{method.lower()}"
            status_class = f"status-{status // 100}xx"
            cookie_lookup = {c["name"]: c["value"] for c in request.get("cookies", [])}

            if self.session_view:
                session_key = self._get_session_key(entry)
                color = (
                    self.session_color_map.get(session_key, "#888888")
                    if session_key
                    else "#888888"
                )
                label_text = (
                    f"[{color}]{method:7} "
                    f"{status} "
                    f"{domain:30} "
                    f"{short_path:40} "
                )
                for cookie_name in self.session_cookie_names:
                    value = cookie_lookup.get(cookie_name, "")
                    if len(value) > 15:
                        value = value[:12] + "..."
                    label_text += f"{value:<17} "
                label_text = label_text.rstrip() + f"[/{color}]"
            else:
                label_text = (
                    f"[{method_class}]{method:7}[/{method_class}] "
                    f"[{status_class}]{status}[/{status_class}] "
                    f"{domain:30} "
                    f"{short_path:40} "
                )
                for cookie_name in self.session_cookie_names:
                    value = cookie_lookup.get(cookie_name, "")
                    if len(value) > 15:
                        value = value[:12] + "..."
                    label_text += f"[dim]{value:<17}[/dim] "
                label_text = label_text.rstrip()

            item = ListItem(Label(label_text, classes="entry-label"))
            item.data = i  # Store original index for entry lookup
            list_view.append(item)

    def _get_status_text(self) -> str:
        """Generate status bar text based on current state."""
        if self.filter_mode:
            return " FILTER BY: (m)ethod  (d)omain  (p)ath  (i)session  |  (f) cancel"

        parts = []
        if self.session_view:
            parts.append("SESSION VIEW")

        if self.active_filter:
            filter_type = self.active_filter["type"]
            filter_value = self.active_filter["value"]
            if len(filter_value) > 30:
                filter_value = filter_value[:27] + "..."
            parts.append(f"FILTER: {filter_type}={filter_value}")

        visible_indices = (
            self.filtered_indices
            if self.filtered_indices is not None
            else range(len(self.entries))
        )
        displayed = len([i for i in visible_indices if i not in self.deleted_indices])
        total = len(self.entries) - len(self.deleted_indices)
        parts.append(f"{displayed}/{total} entries from {self.har_path.name}")

        if self.deleted_indices:
            parts.append(f"{len(self.deleted_indices)} deleted")

        if self.session_view:
            parts.append(f"{len(self.session_color_map)} sessions")

        return " " + " | ".join(parts)

    def _update_status_bar(self) -> None:
        """Update the status bar with entry count and mode."""
        status = self.query_one("#status-bar", Static)
        new_text = self._get_status_text()
        status.update(new_text, layout=True)
        self.refresh(layout=True)

    def action_toggle_session_view(self) -> None:
        """Toggle session view coloring."""
        self.session_view = not self.session_view
        self._populate_list()
        self._update_status_bar()

    def action_select_entry(self) -> None:
        """Show detail view for the selected entry."""
        list_view = self.query_one("#entry-list", ListView)
        if (item := list_view.highlighted_child) and hasattr(item, "data"):
            index = item.data
            self.push_screen(EntryDetailScreen(self.entries[index], index))

    def on_list_view_selected(self, event: ListView.Selected) -> None:
        """Handle Enter press on list item."""
        if hasattr(event.item, "data"):
            index = event.item.data
            self.push_screen(EntryDetailScreen(self.entries[index], index))

    def _get_selected_entry(self) -> dict | None:
        """Get the currently selected entry."""
        list_view = self.query_one("#entry-list", ListView)
        if (item := list_view.highlighted_child) and hasattr(item, "data"):
            return self.entries[item.data]
        return None

    def action_toggle_filter_mode(self) -> None:
        """Toggle filter mode or clear active filter."""
        if self.filter_mode:
            self.filter_mode = False
            self.notify("Filter mode OFF")
        elif self.active_filter:
            self.active_filter = None
            self.filtered_indices = None
            self._populate_list()
            self.notify("Filter cleared")
        else:
            self.filter_mode = True
            self.notify("Filter mode ON - select filter type")
        self._update_status_bar()

    def _apply_filter(self, filter_type: str, value: str, match_fn: callable) -> None:
        """Apply a filter and update the display."""
        self.filter_mode = False
        self.active_filter = {"type": filter_type, "value": value}
        self.filtered_indices = [
            i for i, entry in enumerate(self.entries) if match_fn(entry)
        ]
        self._populate_list()
        self._update_status_bar()

    def action_filter_by_method(self) -> None:
        """Filter by HTTP method of selected entry."""
        if not self.filter_mode:
            return
        if entry := self._get_selected_entry():
            method = entry["request"]["method"]
            self._apply_filter(
                "METHOD",
                method,
                lambda e: e["request"]["method"] == method,
            )

    def action_filter_by_domain(self) -> None:
        """Filter by domain of selected entry."""
        if not self.filter_mode:
            return
        if entry := self._get_selected_entry():
            domain = urlparse(entry["request"]["url"]).netloc
            self._apply_filter(
                "DOMAIN",
                domain,
                lambda e: urlparse(e["request"]["url"]).netloc == domain,
            )

    def action_filter_by_path(self) -> None:
        """Filter by path of selected entry."""
        if not self.filter_mode:
            return
        if entry := self._get_selected_entry():
            path = urlparse(entry["request"]["url"]).path
            self._apply_filter(
                "PATH",
                path,
                lambda e: urlparse(e["request"]["url"]).path == path,
            )

    def action_invert_filter(self) -> None:
        """Invert the current filter to show excluded entries."""
        if self.filtered_indices is None:
            return
        filtered_set = set(self.filtered_indices)
        self.filtered_indices = [
            i for i in range(len(self.entries)) if i not in filtered_set
        ]
        self.active_filter["value"] = "NOT " + self.active_filter["value"]
        self._populate_list()
        self._update_status_bar()
        self.notify("Filter inverted")

    def action_delete_entry(self) -> None:
        """Delete the currently highlighted entry."""
        list_view = self.query_one("#entry-list", ListView)
        if (item := list_view.highlighted_child) and hasattr(item, "data"):
            self.deleted_indices.add(item.data)
            self._populate_list()
            self._update_status_bar()

    def action_quit(self) -> None:
        """Save modified HAR file if entries were deleted, then quit."""
        if self.deleted_indices:
            self.har_data["log"]["entries"] = [
                entry
                for i, entry in enumerate(self.entries)
                if i not in self.deleted_indices
            ]
            with open(self.har_path, "w", encoding="utf-8") as f:
                json.dump(self.har_data, f, indent=2)
        self.exit()

    def action_filter_by_session(self) -> None:
        """Filter by session ID of selected entry."""
        if not self.filter_mode:
            return
        if entry := self._get_selected_entry():
            session_key = self._get_session_key(entry)
            if session_key:
                self._apply_filter(
                    "SESSION",
                    session_key.split(":", 1)[1][:20],
                    lambda e: self._get_session_key(e) == session_key,
                )
