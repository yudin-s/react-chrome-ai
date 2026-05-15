# Security

This package runs against browser-native Chrome APIs only. It does not send prompts to a server and does not include API-key handling.

Applications using this package should still:

- tell users when local AI is unavailable or downloading;
- validate structured model output before taking action;
- avoid using model output for security-critical decisions without deterministic checks;
- respect Chrome's permissions policy and origin-trial requirements where applicable.

Please report security issues privately through the repository owner before opening a public issue.
