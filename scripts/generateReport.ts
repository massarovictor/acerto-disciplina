import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import puppeteer, { Browser } from 'puppeteer';

const DEFAULT_OUTPUT = 'class-report.pdf';
const DEFAULT_URL = 'http://localhost:5173/printable-report';

interface ArgOptions {
  url: string;
  output: string;
  format: string;
  landscape: boolean;
  scale: number;
  waitFor: number;
}

const parseArgs = (): ArgOptions => {
  const args = process.argv.slice(2);
  const options: ArgOptions = {
    url: process.env.REPORT_URL || DEFAULT_URL,
    output: DEFAULT_OUTPUT,
    format: 'A4',
    landscape: false,
    scale: 1,
    waitFor: 2000,
  };

  args.forEach((arg, index) => {
    switch (arg) {
      case '--url':
        options.url = args[index + 1] || options.url;
        break;
      case '--output':
        options.output = args[index + 1] || options.output;
        break;
      case '--format':
        options.format = args[index + 1] || options.format;
        break;
      case '--landscape':
        options.landscape = true;
        break;
      case '--scale':
        options.scale = parseFloat(args[index + 1]) || options.scale;
        break;
      case '--wait-for':
        options.waitFor = parseInt(args[index + 1], 10) || options.waitFor;
        break;
      default:
        break;
    }
  });

  return options;
};

async function generateReport({
  url,
  output,
  format,
  landscape,
  scale,
  waitFor,
}: ArgOptions) {
  let browser: Browser | null = null;
  try {
    console.log(`[Report] Launching headless browser...`);
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60_000);

    console.log(`[Report] Loading ${url}`);
    await page.goto(url, {
      waitUntil: 'networkidle0',
    });

    if (waitFor > 0) {
      console.log(`[Report] Waiting additional ${waitFor}ms for charts/components...`);
      await page.waitForTimeout(waitFor);
    }

    console.log('[Report] Generating PDF...');
    await page.pdf({
      path: output,
      format,
      landscape,
      scale,
      printBackground: true,
      preferCSSPageSize: true,
    });

    console.log(`[Report] PDF saved to ${path.resolve(output)}`);
  } catch (error) {
    console.error('[Report] Failed to generate PDF:', error);
    process.exitCode = 1;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

const options = parseArgs();
generateReport(options);
