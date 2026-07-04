// ##### Part of the **[retold](https://fable-retold.io/)** system
/**
* @license MIT
* @author <steven@velozo.com>
*/

// Add a template to the manifest
module.exports = (pState, pTemplatePath, pTemplateFile) =>
{
	pState.Manifest.Templates.push({Path:pTemplatePath, File:pTemplateFile});
};