import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve, relative, sep } from "node:path";

const root = process.cwd();
const catalogFile = resolve(root, "docs/projects.json");
const failures = [];
const fail = message => failures.push(message);

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

if (!existsSync(catalogFile)) {
  console.error("Missing docs/projects.json");
  process.exit(1);
}

let catalog;
try {
  catalog = JSON.parse(readFileSync(catalogFile, "utf8"));
} catch (error) {
  console.error("Invalid docs/projects.json:", error.message);
  process.exit(1);
}

if (catalog.schemaVersion !== 1) fail("schemaVersion must be 1");
if (!Number.isInteger(catalog.catalogVersion) || catalog.catalogVersion < 1) fail("catalogVersion must be a positive integer");
if (catalog.repository !== "yixuanqi/PhotoGallery") fail("repository must be yixuanqi/PhotoGallery");
if (!isHttpsUrl(catalog.baseUrl) || !catalog.baseUrl.endsWith("/")) fail("baseUrl must be an HTTPS URL ending with /");
if (!/^\d{4}-\d{2}-\d{2}$/.test(catalog.updatedAt || "")) fail("updatedAt must use YYYY-MM-DD");
if (!Array.isArray(catalog.projects) || catalog.projects.length === 0) fail("projects must be a non-empty array");

const allowedKinds = new Set(["portal-experience","interactive-web","desktop-app","research-project","android-app"]);
const allowedStatuses = new Set(["idea","development","testing","published","archived"]);
const seenIds = new Set();
const seenOrders = new Set();
const seenSourcePaths = new Set();
let localCount = 0;
let externalCount = 0;

for (const [index, project] of (catalog.projects || []).entries()) {
  const prefix = `projects[${index}]`;
  if (!project || typeof project !== "object" || Array.isArray(project)) {
    fail(`${prefix} must be an object`);
    continue;
  }

  for (const field of ["id","name","kind","category","status","summary","primaryUrl","primaryAction","repositoryUrl"]) {
    if (typeof project[field] !== "string" || !project[field].trim()) fail(`${prefix}.${field} must be a non-empty string`);
  }
  if (typeof project.id === "string") {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.id)) fail(`${prefix}.id must be lowercase kebab-case: ${project.id}`);
    if (seenIds.has(project.id)) fail(`duplicate project id: ${project.id}`);
    seenIds.add(project.id);
  }
  if (!allowedKinds.has(project.kind)) fail(`${prefix}.kind is unsupported: ${project.kind}`);
  if (!allowedStatuses.has(project.status)) fail(`${prefix}.status is unsupported: ${project.status}`);
  if (!isHttpsUrl(project.primaryUrl)) fail(`${prefix}.primaryUrl must be HTTPS`);
  if (!isHttpsUrl(project.repositoryUrl)) fail(`${prefix}.repositoryUrl must be HTTPS`);

  if (!Array.isArray(project.tags) || project.tags.length === 0 || project.tags.some(x => typeof x !== "string" || !x.trim())) {
    fail(`${prefix}.tags must be a non-empty string array`);
  }
  if (project.techStack !== undefined && (!Array.isArray(project.techStack) || project.techStack.some(x => typeof x !== "string" || !x.trim()))) {
    fail(`${prefix}.techStack must contain only non-empty strings`);
  }

  if (!Number.isInteger(project.sortOrder) || project.sortOrder < 0) fail(`${prefix}.sortOrder must be a non-negative integer`);
  else {
    if (seenOrders.has(project.sortOrder)) fail(`duplicate sortOrder: ${project.sortOrder}`);
    seenOrders.add(project.sortOrder);
  }

  const isLocalPage = project.kind === "portal-experience" || project.kind === "interactive-web";
  if (isLocalPage) {
    localCount++;
    const expectedPath = `docs/${project.id}/index.html`;
    if (project.sourcePath !== expectedPath) fail(`${prefix}.sourcePath must be ${expectedPath}`);
    if (typeof project.sourcePath === "string") {
      if (project.sourcePath.startsWith("/") || project.sourcePath.split("/").includes("..")) fail(`${prefix}.sourcePath must be repository-relative and safe`);
      const absolutePath = resolve(root, project.sourcePath);
      const rel = relative(root, absolutePath);
      if (rel.startsWith(".." + sep) || rel === "..") fail(`${prefix}.sourcePath escapes repository root`);
      else if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) fail(`${prefix}.sourcePath does not exist: ${project.sourcePath}`);
      if (seenSourcePaths.has(project.sourcePath)) fail(`duplicate sourcePath: ${project.sourcePath}`);
      seenSourcePaths.add(project.sourcePath);
    }
    if (isHttpsUrl(catalog.baseUrl) && typeof project.id === "string") {
      const expectedUrl = new URL(`${project.id}/`, catalog.baseUrl).href;
      if (project.primaryUrl !== expectedUrl) fail(`${prefix}.primaryUrl must be ${expectedUrl}`);
    }
  } else {
    externalCount++;
    if (project.sourcePath !== undefined) fail(`${prefix}.sourcePath must be omitted for external project kinds`);
  }
}

if (failures.length) {
  console.error("Project catalog validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Project catalog valid: ${catalog.projects.length} records, ${localCount} local Pages entries, ${externalCount} external entries.`);
