import { NextRequest, NextResponse } from 'next/server';
import { rm } from 'fs/promises';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

/**
 * Validate path stays within allowed root directory.
 * Prevents path traversal attacks like ../../../etc/passwd
 *
 * @param targetPath - User-provided path to validate
 * @param allowedRoot - Root directory that bounds allowed operations
 * @returns Resolved absolute path
 * @throws Error if path traversal detected
 */
function validatePath(targetPath: string, allowedRoot: string): string {
  const resolved = path.resolve(targetPath);
  const relative = path.relative(allowedRoot, resolved);

  // If relative path starts with '..', it's outside allowed root
  if (relative.startsWith('..')) {
    throw new Error('Path traversal detected');
  }

  return resolved;
}

/**
 * DELETE /api/files/operations
 *
 * Delete a file or folder recursively.
 *
 * Request body: { path: string, rootPath: string }
 * Response: { success: true } | { error: string }
 *
 * Security:
 * - Path traversal validation via validatePath()
 * - File existence check before deletion
 * - Permission error handling (EACCES -> 403)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { path: targetPath, rootPath } = await request.json();

    // Validate required fields
    if (!targetPath || !rootPath) {
      return NextResponse.json(
        { error: 'path and rootPath required' },
        { status: 400 }
      );
    }

    // Security: Validate path stays within root
    const resolved = validatePath(targetPath, rootPath);

    // Check if path exists
    if (!fs.existsSync(resolved)) {
      return NextResponse.json(
        { error: 'Path not found' },
        { status: 404 }
      );
    }

    // Delete file or folder recursively
    await rm(resolved, { recursive: true, force: true });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    // Handle known error types
    if (error instanceof Error) {
      // Path traversal attempt
      if (error.message === 'Path traversal detected') {
        return NextResponse.json(
          { error: 'Invalid path' },
          { status: 403 }
        );
      }

      // Permission denied
      if ('code' in error && error.code === 'EACCES') {
        return NextResponse.json(
          { error: 'Permission denied' },
          { status: 403 }
        );
      }
    }

    // Log and return generic error
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/files/operations
 *
 * Create a ZIP archive of a file or folder for download.
 *
 * Request body: { path: string, rootPath: string }
 * Response: ZIP buffer with download headers
 *
 * Security:
 * - Path traversal validation via validatePath()
 * - File existence check before zipping
 * - Only operations within provided rootPath
 */
export async function POST(request: NextRequest) {
  try {
    const { path: targetPath, rootPath } = await request.json();

    // Validate required fields
    if (!targetPath || !rootPath) {
      return NextResponse.json(
        { error: 'path and rootPath required' },
        { status: 400 }
      );
    }

    // Security: Validate path stays within root
    const resolved = validatePath(targetPath, rootPath);

    // Check if path exists
    if (!fs.existsSync(resolved)) {
      return NextResponse.json(
        { error: 'Path not found' },
        { status: 404 }
      );
    }

    // Create ZIP archive
    const zip = new AdmZip();
    const stats = await fs.promises.stat(resolved);

    if (stats.isDirectory()) {
      // Add entire folder to ZIP
      zip.addLocalFolder(resolved);
    } else {
      // Add single file to ZIP
      zip.addLocalFile(resolved);
    }

    // Convert to buffer for download
    const zipBuffer = zip.toBuffer();
    const filename = `${path.basename(resolved)}.zip`;

    // Return ZIP with download headers (convert to Uint8Array for NextResponse)
    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });
  } catch (error: unknown) {
    // Handle known error types
    if (error instanceof Error) {
      // Path traversal attempt
      if (error.message === 'Path traversal detected') {
        return NextResponse.json(
          { error: 'Invalid path' },
          { status: 403 }
        );
      }

      // Permission denied
      if ('code' in error && error.code === 'EACCES') {
        return NextResponse.json(
          { error: 'Permission denied' },
          { status: 403 }
        );
      }
    }

    // Log and return generic error
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Failed to create download' },
      { status: 500 }
    );
  }
}
