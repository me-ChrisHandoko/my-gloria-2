#!/usr/bin/env node

/**
 * Script to update permission fixtures with code and name fields
 */

const fs = require('fs');
const path = require('path');

const fixtureFile = path.join(__dirname, '../test/fixtures/test-data.ts');
const content = fs.readFileSync(fixtureFile, 'utf8');

// Function to generate code from id
function generateCode(id) {
  return id
    .replace('perm-', '')
    .replace(/-/g, '_')
    .toUpperCase();
}

// Function to generate name from description
function generateName(description) {
  return description;
}

// Pattern to match permission objects
const permissionPattern = /(\s*)([\w]+):\s*\{\s*\n\s*id:\s*'(perm-[^']+)',\s*\n\s*resource:\s*'([^']+)',\s*\n\s*action:\s*'([^']+)',\s*\n\s*scope:\s*'([^']+)',\s*\n\s*description:\s*'([^']+)',/g;

// Replace function
const updatedContent = content.replace(
  permissionPattern,
  (match, indent, propName, id, resource, action, scope, description) => {
    const code = generateCode(id);
    const name = generateName(description);
    
    return `${indent}${propName}: {
${indent}  id: '${id}',
${indent}  code: '${code}',
${indent}  name: '${name}',
${indent}  resource: '${resource}',
${indent}  action: '${action}',
${indent}  scope: '${scope}',
${indent}  description: '${description}',`;
  }
);

// Write the updated content back
fs.writeFileSync(fixtureFile, updatedContent, 'utf8');

console.log('✅ Permission fixtures updated with code and name fields');