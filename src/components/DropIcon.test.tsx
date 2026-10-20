import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DropIcon, { isSafeIconSvg } from './DropIcon';

describe('drop icon safety', () => {
  it('accepts a plain svg', () => expect(isSafeIconSvg('<svg viewBox="0 0 16 16"><rect/></svg>')).toBe(true));
  it('rejects script, foreignObject, javascript: and on* attributes', () => {
    for (const s of ['<svg><script>x</script></svg>', '<svg><foreignObject/></svg>', '<svg><a href="javascript:x"/></svg>', '<svg onload="x"></svg>', '<div></div>']) expect(isSafeIconSvg(s)).toBe(false);
  });
  it('renders no img for an unsafe icon', () => {
    const { container } = render(<DropIcon svg="<svg><script>alert(1)</script></svg>" size={16} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
