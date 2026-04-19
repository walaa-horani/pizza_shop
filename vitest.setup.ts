import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// `server-only` throws when imported outside a React Server Component.
// Treat it as a no-op under vitest so `lib/*` modules that guard against
// client bundling can still be exercised in unit tests.
vi.mock('server-only', () => ({}));
