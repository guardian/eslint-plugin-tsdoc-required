import { ESLintUtils } from '@typescript-eslint/utils';
import { tsdocRequiredRule } from './tsdoc-required';

const valid = `
const foo = "bar";

/**
 * Example valid comment.
 */
export interface GuFoo {}`;

const invalidDocstring = `
// Example invalid comment.
export interface GuFoo {}`;

const missingDocstring = `
/**
 * Example valid comment.
 */
export interface GuLambdaTaskProps {
	/**
	 * For:
	 *
	 *   Go   - the name of your binary, e.g. 'MyBinary'
	 *   Node - filename and name of exported handler method, e.g. 'index.handler'
	 *   Scala - the package and class, e.g. 'package.Class'
	 *
	 * See https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-function.html#cfn-lambda-function-handler.
	 */
	readonly handler: string;
	readonly timeout?: Duration;
}`;

describe('docs', () => {
	const ruleTester = new ESLintUtils.RuleTester({
		parser: '@typescript-eslint/parser',
		parserOptions: {
			project: '../../tsconfig.json',
			tsconfigRootDir: __dirname,
		},
	});

	ruleTester.run('@guardian/eslint-tsdoc-required', tsdocRequiredRule, {
		valid: [{ code: valid }],

		invalid: [
			{
				code: invalidDocstring,
				errors: [{ messageId: 'invalidCommentFormat' }],
			},
			{ code: missingDocstring, errors: [{ messageId: 'missingDocstring' }] },
		],
	});
});
