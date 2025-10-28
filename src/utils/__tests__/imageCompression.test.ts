import { describe, it, expect } from 'vitest';
import { validateImageFile } from '../imageCompression';

function fakeFile(type: string, sizeBytes: number): any {
  // Solo necesitamos las propiedades usadas por validateImageFile
  return { type, size: sizeBytes } as any;
}

describe('validateImageFile', () => {
  it('acepta tipos permitidos', () => {
    const file = fakeFile('image/jpeg', 1024);
    const res = validateImageFile(file);
    expect(res.valid).toBe(true);
  });

  it('rechaza tipos no permitidos', () => {
    const file = fakeFile('application/pdf', 1024);
    const res = validateImageFile(file);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/Tipo de archivo no permitido/i);
  });

  it('rechaza archivos que exceden tamaño máximo', () => {
    const file = fakeFile('image/png', 5 * 1024 * 1024);
    const res = validateImageFile(file, { maxSizeMB: 1 });
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/muy grande/i);
  });
});
