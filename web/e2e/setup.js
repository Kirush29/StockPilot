// Live end-to-end setup: DOM matchers and per-test cleanup, but no MSW — requests go to the real API.
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => cleanup())
