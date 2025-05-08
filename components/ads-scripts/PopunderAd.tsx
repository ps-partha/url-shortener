// components/PopunderAd.tsx
import { useEffect } from 'react';

const PopunderAd = () => {
  useEffect(() => {
    // Array containing the two Popunder script URLs
    const popunderScripts = [
      '//whopping-click.com/c-DG9.6/b/2m5/lOShW/QU9rNxj/Mpz_NrTKQY3mM-iq0C2/MezuM/1CNRDGcTzw',
      '//pl26593028.profitableratecpm.com/40/d1/9a/40d19afa2c49f8968228cb3f1a55add1.js'
    ];

    // Randomly select one of the URLs
    const randomScript = popunderScripts[Math.floor(Math.random() * popunderScripts.length)];

    // Create and append the selected script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = randomScript;
    script.async = true;

    // Append the script to the document's head
    document.head.appendChild(script);

    // Cleanup: Remove the script when the component unmounts
    return () => {
      document.head.removeChild(script);
    };
  }, []); // This runs once when the component mounts

  return null; // No visible UI is rendered, only the script is added to the page
};

export default PopunderAd;
