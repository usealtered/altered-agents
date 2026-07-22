type ExtractTextTemplateParams<Text extends string> =
    Text extends `${string}{{${infer Param}}}${infer Rest}`
        ? Param | ExtractTextTemplateParams<Rest>
        : never

type TextTemplateParams<Text extends string> = {
    [Key in ExtractTextTemplateParams<Text> & string]: string
}

const TEXT_TEMPLATE_PARAM_PATTERN = /\{\{(\w+)\}\}/g

function populateTextTemplate(
    template: string,
    params: Record<string, string>
): string {
    return template.replace(
        TEXT_TEMPLATE_PARAM_PATTERN,
        (_, key: string) => params[key] ?? `{{${key}}}`
    )
}

/**
 * Populates a text template with values defined using the `{{placeholderName}}` syntax. Placeholder names must use word characters only.
 */
function createTemplatedText<const Text extends string>(
    template: Text,
    params: TextTemplateParams<Text>
): string {
    return populateTextTemplate(template, params)
}

export {
    createTemplatedText,
    type ExtractTextTemplateParams,
    type TextTemplateParams
}
