import { mathjax } from 'mathjax-full/js/mathjax';
import { TeX } from 'mathjax-full/js/input/tex';
import { SVG } from 'mathjax-full/js/output/svg';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages';

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

/**
 * Build a fresh converter per page render: MathJax keeps label/state on the
 * document instance, so reusing one across converts reports duplicate labels.
 */
export function createTexConverter(): (tex: string, display: boolean) => string | null {
  const doc = mathjax.document('', {
    InputJax: new TeX({ packages: AllPackages, inlineMath: [['$', '$'], ['\\(', '\\)']], displayMath: [['$$', '$$'], ['\\[', '\\]']] }),
    OutputJax: new SVG({ fontCache: 'local' })
  });
  return (src: string, display: boolean) => {
    try {
      const node = doc.convert(src, { display, end: { chars: 0 } });
      return adaptor.outerHTML(node);
    } catch {
      return null;
    }
  };
}
