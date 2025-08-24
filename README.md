# Vialty Blog

Don't you DARE using anything from this repository.

## Development Notes

- Images are stored on disk under `public/uploads` and served statically.
- The admin image API supports adding, deleting and renaming files without external services.
- Image optimization uses the optional `sharp` dependency; uploads are saved as-is when it isn't available.
