import {
	SourceCode,
	RuleContext,
} from '@typescript-eslint/utils/dist/ts-eslint';
import { ESLintUtils } from '@typescript-eslint/utils';
import { TSDocConfiguration, TSDocParser } from '@microsoft/tsdoc';
import { Node } from '@typescript-eslint/types/dist/generated/ast-spec';

const createRule = ESLintUtils.RuleCreator(
	(name) => `@guardian/eslint-${name}`,
);

const tsdocMessageIds: { [x: string]: string } = {};
const defaultTSDocConfiguration: TSDocConfiguration = new TSDocConfiguration();

defaultTSDocConfiguration.allTsdocMessageIds.forEach((messageId: string) => {
	tsdocMessageIds[messageId] = `${messageId}: {{unformattedText}}`;
});

const check = (
	context: RuleContext<string, never[]>,
	sourceCode: Readonly<SourceCode>,
	node: Node,
): void => {
	const comments = sourceCode.getCommentsBefore(node);

	if (comments.length == 0) {
		context.report({
			messageId: 'missingDocstring',
			node: node,
		});
		return;
	}

	const before = sourceCode.getTokenBefore(node);

	const firstComment = comments[0];

	if (before && before.range[1] > firstComment.range[0]) {
		// comment is for something else
		context.report({
			messageId: 'missingDocstring',
			node: node,
		});
		return;
	}

	if (firstComment.type != 'Block') {
		context.report({
			messageId: 'invalidCommentFormat',
			node: node,
		});
		return;
	}

	const tsdocParser = new TSDocParser();
	const parserContext = tsdocParser.parseString(
		'/*' + firstComment.value + '*/',
	); // Note, wrap comment begin/end as TSDoc requires these.

	for (const message of parserContext.log.messages) {
		context.report({
			node: node,
			messageId: message.messageId,
			data: {
				unformattedText: message.unformattedText,
			},
		});
	}
};

// https://astexplorer.net/ is really helpful here. Set lang to 'Javascript' and
// parser to '@typescript/eslint-parser' and input some code to explore the AST.
export const tsdocRequiredRule = createRule({
	create(context) {
		return {
			// Check properties in exported interfaces
			'ExportNamedDeclaration > TSInterfaceDeclaration TSPropertySignature'(
				node,
			) {
				const sourceCode = context.getSourceCode();
				check(context, sourceCode, node);
			},

			// Check any (directly) exported members
			ExportNamedDeclaration(node) {
				const sourceCode = context.getSourceCode();
				const child = node.declaration;
				if (child && child.type === 'TSInterfaceDeclaration') {
					if (child.id.name.includes('Props')) {
						return; // we don't require comments on Props
					}
				}

				check(context, sourceCode, node);
			},
		};
	},
	name: 'tsdoc-required',
	meta: {
		docs: {
			description: 'Required TSDoc documentation on all exported members.',
			recommended: 'error',
		},
		messages: {
			invalidCommentFormat:
				'TSDoc comments must be block style("/** ... */") not line ("// ...") style comments.',
			invalidDocstring: 'Ensure docstring is a valid TSDoc comment.',
			missingDocstring:
				'Ensure exported members are documented with a TSDoc-compatible comment.',
			...tsdocMessageIds,
		} as Record<string, string>,
		type: 'problem',
		schema: [],
	},
	defaultOptions: [],
});
