# Vialty Blog

Don't you DARE using anything from this repository.

## Development Notes

- Images are stored on ImageKit and served via its CDN.
- The admin image API now uses ImageKit for uploading, listing, deleting and renaming files.
- Set the following environment variables for ImageKit credentials:
  - `IMAGEKIT_PUBLIC_KEY`
  - `IMAGEKIT_PRIVATE_KEY`
  - `IMAGEKIT_URL_ENDPOINT`
- Image optimization uses the optional `sharp` dependency; uploads are saved as-is when it isn't available.
