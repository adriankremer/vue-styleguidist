import * as bt from '@babel/types'
import { NodePath } from 'ast-types'
import Documentation, { BlockTag, DocBlockTags, SetupDescriptor, Param, ParamTag, Tag } from '../Documentation'
import getDocblock from '../utils/getDocblock'
import getDoclets from '../utils/getDoclets'
import getTypeFromAnnotation from '../utils/getTypeFromAnnotation'
import transformTagsIntoObject from '../utils/transformTagsIntoObject'
import getMemberFilter from '../utils/getPropsFilter'

/**
 * Extracts setup information from an object-style VueJs component
 * @param documentation
 * @param path
 */
export default async function setupHandler(documentation: Documentation, path: NodePath) {
	if (bt.isObjectExpression(path.node)) {
		const setupPath = path
			.get('properties')
			.filter((p: NodePath) => bt.isObjectMethod(p.node) && getMemberFilter('setup')(p)) as Array<
			NodePath<bt.ObjectProperty>
		>

		// if no setup return
		if (!setupPath.length) {
			return
		}

		const setupObject = setupPath[0].get('value')
		if (bt.isObjectExpression(setupObject.node)) {
			setupObject.node.body.body.each((p: NodePath) => {
				let setupName = '<anonymous>'
				setupName = bt.isFunctionDeclaration(p.node) ? p.node.id?.name || '' : setupName

				const docBlock = getDocblock(bt.isObjectMethod(p.node) ? p : p.parentPath)

				const jsDoc: DocBlockTags = docBlock ? getDoclets(docBlock) : { description: '', tags: [] }
				const jsDocTags: BlockTag[] = jsDoc.tags ? jsDoc.tags : []

				// ignore the setup if there is no public tag
				if (!jsDocTags.some((t: Tag) => t.title === 'access' && t.content === 'public')) {
					return
				}

				const setupDescriptor = documentation.getSetupDescriptor(setupName)

				if (jsDoc.description) {
					setupDescriptor.description = jsDoc.description
				}
				setSetupDescriptor(setupDescriptor, p as NodePath<bt.Function>, jsDocTags)
			})
		}
	}
}

export function setSetupDescriptor(
	setupDescriptor: SetupDescriptor,
	setup: NodePath<bt.Function>,
	jsDocTags: BlockTag[]
) {
	// params
	describeParams(
		setup,
		setupDescriptor,
		jsDocTags.filter((tag) => ['param', 'arg', 'argument'].indexOf(tag.title) >= 0)
	)

	// returns
	describeReturns(
		setup,
		setupDescriptor,
		jsDocTags.filter((t) => t.title === 'returns')
	)

	// tags
	setupDescriptor.tags = transformTagsIntoObject(jsDocTags)

	return setupDescriptor
}

function describeParams(
	setupPath: NodePath<bt.Function>,
	setupDescriptor: SetupDescriptor,
	jsDocParamTags: ParamTag[]
) {
	// if there is no parameter no need to parse them
	const fExp = setupPath.node
	if (!fExp.params || !jsDocParamTags || (!fExp.params.length && !jsDocParamTags.length)) {
		return
	}

	const params: Param[] = []
	fExp.params.forEach((par: bt.Identifier | bt.AssignmentPattern, i) => {
		let name: string
		if (bt.isIdentifier(par)) {
			// simple params
			name = par.name
		} else if (bt.isIdentifier(par.left)) {
			// es6 default params
			name = par.left.name
		} else {
			// unrecognized pattern
			return
		}

		const jsDocTags = jsDocParamTags.filter((tag) => tag.name === name)
		let jsDocTag = jsDocTags.length ? jsDocTags[0] : undefined

		// if tag is not namely described try finding it by its order
		if (!jsDocTag) {
			if (jsDocParamTags[i] && !jsDocParamTags[i].name) {
				jsDocTag = jsDocParamTags[i]
			}
		}

		const param: Param = { name }
		if (jsDocTag) {
			if (jsDocTag.type) {
				param.type = jsDocTag.type
			}
			if (jsDocTag.description) {
				param.description = jsDocTag.description
			}
		}

		if (!param.type && par.typeAnnotation) {
			const type = getTypeFromAnnotation(par.typeAnnotation)
			if (type) {
				param.type = type
			}
		}

		params.push(param)
	})

	// in case the arguments are abstracted (using the arguments keyword)
	if (!params.length) {
		jsDocParamTags.forEach((doc) => {
			params.push(doc)
		})
	}

	if (params.length) {
		setupDescriptor.params = params
	}
}

function describeReturns(
	setupPath: NodePath<bt.Function>,
	setupDescriptor: SetupDescriptor,
	jsDocReturnTags: ParamTag[]
) {
	if (jsDocReturnTags.length) {
		const ret = jsDocReturnTags[0]
		if (ret.name && ret.description) {
			ret.description = `${ret.name} ${ret.description}`
		}
		setupDescriptor.returns = ret
	}

	if (!setupDescriptor.returns || !setupDescriptor.returns.type) {
		const setupNode = setupPath.node
		if (setupNode.returnType) {
			const type = getTypeFromAnnotation(setupNode.returnType)
			if (type) {
				setupDescriptor.returns = setupDescriptor.returns || {}
				setupDescriptor.returns.type = type
			}
		}
	}
}
