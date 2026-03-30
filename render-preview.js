#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const projectRoot = __dirname;
const htmlDir = path.join(projectRoot, "html");
const templateDir = path.join(htmlDir, "template");
const previewDir = path.join(htmlDir, "preview");
const PREVIEW_SUFFIX = ".preview.html";

// Ensure directories exist
if (!fs.existsSync(previewDir)) {
  fs.mkdirSync(previewDir, { recursive: true });
}

function escapeTemplateLiteral(text) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

function compileAppsScriptTemplate(templateSource) {
  const tokenRegex = /<\?=([\s\S]*?)\?>|<\?([\s\S]*?)\?>/g;
  let lastIndex = 0;

  let code = 'let __out = "";\n';
  code +=
    'const __write = (v) => { __out += (v === null || v === undefined) ? "" : String(v); };\n';

  let match;
  while ((match = tokenRegex.exec(templateSource)) !== null) {
    const [fullMatch, exprBlock, codeBlock] = match;
    const textBefore = templateSource.slice(lastIndex, match.index);

    if (textBefore) {
      code += `__out += \`${escapeTemplateLiteral(textBefore)}\`;\n`;
    }

    if (exprBlock !== undefined) {
      code += `__write(${exprBlock.trim()});\n`;
    } else if (codeBlock !== undefined) {
      code += `${codeBlock}\n`;
    }

    lastIndex = match.index + fullMatch.length;
  }

  const tail = templateSource.slice(lastIndex);
  if (tail) {
    code += `__out += \`${escapeTemplateLiteral(tail)}\`;\n`;
  }

  code += "return __out;";

  return new Function("data", `with (data || {}) {\n${code}\n}`);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith("--")) continue;

    const raw = item.slice(2);
    if (!raw) continue;

    if (raw.includes("=")) {
      const [key, ...rest] = raw.split("=");
      args[key] = rest.join("=");
      continue;
    }

    const next = argv[i + 1];
    const hasValue = typeof next === "string" && !next.startsWith("--");
    args[raw] = hasValue ? next : true;

    if (hasValue) {
      i += 1;
    }
  }

  return args;
}

function isTemplateHtmlFile(fileName) {
  return (
    fileName.endsWith(".html") &&
    !fileName.endsWith(PREVIEW_SUFFIX) &&
    !fileName.startsWith(".")
  );
}

function normalizeTemplateFileName(inputName) {
  if (!inputName) return "";

  const baseName = path.basename(inputName);
  if (baseName.endsWith(".html")) return baseName;
  return `${baseName}.html`;
}

function listTemplateFiles() {
  return fs.readdirSync(templateDir).filter(isTemplateHtmlFile).sort();
}

function printUsage(templateFiles) {
  console.log("Usage: node render-preview.js [options]");
  console.log("");
  console.log("Options:");
  console.log(
    "  --template=<name>   Render one template (with or without .html)",
  );
  console.log("  --nameCV=<value>    Set nameCV variable used in template");
  console.log(
    "  --all               Render all templates in html/template/ (default)",
  );
  console.log("  --help              Show this help");
  console.log("");
  if (templateFiles.length > 0) {
    console.log("Available templates:");
    for (const file of templateFiles) {
      console.log(`- ${file}`);
    }
  }
}

function getOutputPathForTemplate(templateFileName) {
  const previewName = templateFileName.replace(/\.html$/, PREVIEW_SUFFIX);
  return path.join(previewDir, previewName);
}

function renderTemplateFile(templateFileName, args) {
  const templatePath = path.join(templateDir, templateFileName);
  const templateSource = fs.readFileSync(templatePath, "utf8");
  let render;
  try {
    render = compileAppsScriptTemplate(templateSource);
  } catch (error) {
    throw new Error(
      `Failed to compile template html/template/${templateFileName}: ${error.message}`,
    );
  }

  let html;
  try {
    html = render({
      nameCV: typeof args.nameCV === "string" ? args.nameCV : "",
    });
  } catch (error) {
    throw new Error(
      `Failed to render template html/template/${templateFileName}: ${error.message}`,
    );
  }

  const outputPath = getOutputPathForTemplate(templateFileName);
  fs.writeFileSync(outputPath, html, "utf8");

  return outputPath;
}

function resolveTargets(args, templateFiles) {
  if (args.all) {
    return templateFiles;
  }

  const explicitTemplate =
    typeof args.template === "string" ? args.template : "";

  if (!explicitTemplate) {
    return templateFiles;
  }

  const requested = normalizeTemplateFileName(explicitTemplate);
  if (templateFiles.includes(requested)) {
    return [requested];
  }

  const available = templateFiles.map((f) => `- ${f}`).join("\n");
  throw new Error(
    `Template not found: html/template/${requested}\nAvailable templates:\n${available}`,
  );
}

function renderPreview() {
  if (!fs.existsSync(templateDir)) {
    throw new Error("Template directory not found: html/template/");
  }

  const args = parseArgs(process.argv.slice(2));

  const templateFiles = listTemplateFiles();

  if (templateFiles.length === 0) {
    throw new Error("No template HTML files found in html/template/.");
  }

  if (args.help) {
    printUsage(templateFiles);
    return;
  }

  const targets = resolveTargets(args, templateFiles);

  const renderedPaths = [];
  for (const fileName of targets) {
    const outputPath = renderTemplateFile(fileName, args);
    renderedPaths.push(outputPath);
  }

  if (renderedPaths.length === 1) {
    console.log(
      `✅ Rendered preview: ${path.relative(projectRoot, renderedPaths[0])}`,
    );
    return;
  }

  console.log(`✅ Rendered ${renderedPaths.length} previews:`);
  for (const p of renderedPaths) {
    console.log(`- ${path.relative(projectRoot, p)}`);
  }
}

renderPreview();
