# Vialty Blog

Don't you DARE using anything from this repository.

## Development Notes

- Image admin API caches listings in Redis to limit Blob `list` calls.
- Renames reuse Blob's `copy` when possible to avoid extra uploads.
