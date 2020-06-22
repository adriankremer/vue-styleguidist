import { NodePath } from 'ast-types'
import babylon from '../../babel-parser'
import Documentation, { SetupDescriptor } from '../../Documentation'
import resolveExportedComponent from '../../utils/resolveExportedComponent'
import setupHandler from '../setupHandler'

jest.mock('../../Documentation')

function parse(src: string): NodePath | undefined {
	const ast = babylon({ plugins: ['flow'] }).parse(src)
	return resolveExportedComponent(ast)[0].get('default')
}

function parseTS(src: string): NodePath | undefined {
	const ast = babylon({ plugins: ['typescript'] }).parse(src)
	return resolveExportedComponent(ast)[0].get('default')
}

describe('setupHandler', () => {
	let documentation: Documentation
	let mockSetupDescriptor: SetupDescriptor

	beforeEach(() => {
		mockSetupDescriptor = { name: '', description: '', modifiers: [] }
		const MockDocumentation = Documentation
		documentation = new MockDocumentation('test/path')
		const mockGetSetupDescriptor = documentation.getSetupDescriptor as jest.Mock
		mockGetSetupDescriptor.mockImplementation((name: string) => {
			mockSetupDescriptor.name = name
			return mockSetupDescriptor
		})
	})

	function tester(src: string, matchedObj: any) {
		const def = parse(src)
		if (def) {
			setupHandler(documentation, def).catch((e) => {
				// eslint-disable-next-line no-console
				console.error(e)
			})
		}
		expect(mockSetupDescriptor).toMatchObject(matchedObj)
	}

	it('should ignore every setup not tagged as @public', () => {
		const src = `
    export default {
      name: 'name-123',
      setups:{
        testIgnore(){
          return 1;
        }
      }
    }`
		tester(src, {
			name: ''
		})
	})

	describe('formats', () => {
		it('should return the setup if it is an anonymous function', () => {
			const src = `
    export default {
      setups: {
        /**
         * @public
         */
        testFunction: function(){
          return 1;
        }
      }
    }
    `
			tester(src, {
				name: 'testFunction'
			})
		})

		it('should return the setup if it is an object setup', () => {
			const src = `
        export default {
          setups: {
            /**
             * @public
             */
            testSetup(){
              return 1;
            }
          }
        }
        `
			tester(src, {
				name: 'testSetup'
			})
		})

		it('should return the setup if it is an arrow function', () => {
			const src = `
      export default {
        setups: {
          /**
           * @public
           */
          testArrowFunction: () => {
            return 'test';
          },
        }
      }
      `
			tester(src, {
				name: 'testArrowFunction'
			})
		})

		it('should return the setup if it is a returned function', () => {
			const src = `
      export default {
        setups: {
          /**
           * @public
           */
          testHighFunction: waitFor('thingToWait', () => {
            return 'test';
          }),
        }
      }
      `
			tester(src, {
				name: 'testHighFunction'
			})
		})
	})

	it('should return their parameters', () => {
		const src = `
    export default {
      setups: {
        /**
         * @public
         */
        testWithMultipleParams(param1, param2){
          return param2 + param1;
        }
      }
    }
    `
		tester(src, {
			name: 'testWithMultipleParams',
			params: [{ name: 'param1' }, { name: 'param2' }]
		})
	})

	it('should detect parameters even when es6 defaulted', () => {
		const src = `
    export default {
      setups: {
        /**
         * @public
         */
        testWithMultipleParamsDefaulted(param1, param2 = 3){
          return param2 + param1;
        }
      }
    }
    `
		tester(src, {
			name: 'testWithMultipleParamsDefaulted',
			params: [{ name: 'param1' }, { name: 'param2' }]
		})
	})

	it('should allow description of setups', () => {
		const src = `
    export default {
      name: 'name-123',
      setups: {
        /**
         * it returns 2
         * @public
         */
        describedFunc(){
          return 2;
        }
      }
    }
    `
		tester(src, {
			name: 'describedFunc',
			description: 'it returns 2'
		})
	})

	it('should allow description of params', () => {
		const src = `
    export default {
      name: 'name-123',
      setups: {
        /**
         * @public
         * @param {string} p2 - multiplier
         */
        describedParams(p1, p2){
          return p2 * 2;
        }
      }
    }
    `
		tester(src, {
			name: 'describedParams',
			params: [{ name: 'p1' }, { name: 'p2', description: 'multiplier', type: { name: 'string' } }]
		})
	})

	it('should allow description of args', () => {
		const src = `
    export default {
      name: 'name-123',
      setups: {
        /**
         * @public
         * @arg {string} p2 - multiplier
         */
        describedParams(p1, p2){
          return p2 * 2;
        }
      }
    }
    `
		tester(src, {
			name: 'describedParams',
			params: [{ name: 'p1' }, { name: 'p2', description: 'multiplier', type: { name: 'string' } }]
		})
	})

	it('should allow description of arguments', () => {
		const src = `
    export default {
      name: 'name-123',
      setups: {
        /**
         * @public
         * @argument {string} p2 - multiplier
         */
        describedParams(p1, p2){
          return p2 * 2;
        }
      }
    }
    `
		tester(src, {
			name: 'describedParams',
			params: [{ name: 'p1' }, { name: 'p2', description: 'multiplier', type: { name: 'string' } }]
		})
	})

	it('should allow description of params even if they are implicit', () => {
		const src = `
    export default {
      name: 'name-123',
      setups: {
        /**
         * @public
         * @param {string} - unnamed param
         * @param {number} - another unnamed param
         */
        describedParams(){
          return arguments;
        }
      }
    }
    `
		tester(src, {
			name: 'describedParams',
			params: [
				{ description: 'unnamed param', type: { name: 'string' } },
				{ description: 'another unnamed param', type: { name: 'number' } }
			]
		})
	})

	it('should allow description of params without naming them', () => {
		const src = `
    export default {
      name: 'name-123',
      setups: {
        /**
         * @public
         * @param {string} - unnamed param
         * @param {number} - another unnamed param
         */
        describedParams(p, p2){
          return p * 2;
        }
      }
    }
    `
		tester(src, {
			name: 'describedParams',
			params: [
				{ name: 'p', description: 'unnamed param', type: { name: 'string' } },
				{ name: 'p2', description: 'another unnamed param', type: { name: 'number' } }
			]
		})
	})

	describe('flow', () => {
		it('should deduce the type of params from the param type', () => {
			const src = [
				'/* @flow */',
				'export default {',
				'  setups:{',
				'    /**',
				'     * @public',
				'     */',
				'    publicSetup(param: string, paramObscure: ObscureInterface) {',
				'      console.log("test", paramObscure)',
				'    }',
				'  }',
				'}'
			].join('\n')

			const def = parse(src)
			if (def) {
				setupHandler(documentation, def)
			}
			expect(mockSetupDescriptor).toMatchObject({
				name: 'publicSetup',
				params: [
					{ name: 'param', type: { name: 'string' } },
					{ name: 'paramObscure', type: { name: 'ObscureInterface' } }
				]
			})
		})

		it('should deduce the return type from setup', () => {
			const src = [
				'/* @flow */',
				'export default {',
				'  setups:{',
				'    /**',
				'     * @public',
				'     */',
				'    publicSetup(): string {',
				'      console.log("test")',
				'    }',
				'  }',
				'}'
			].join('\n')

			const def = parse(src)
			if (def) {
				setupHandler(documentation, def)
			}
			expect(mockSetupDescriptor).toMatchObject({
				name: 'publicSetup',
				returns: { type: { name: 'string' } }
			})
		})
	})

	describe('typescript', () => {
		it('should deduce the type of params from the param type', () => {
			const src = `
      export default {
        setups:{
          /**
           * @public
           */
          publicSetup(param: string, paramObscure: ObscureInterface) {
            console.log('test', test, param)
          }
        }
      }
      `

			const def = parse(src)
			if (def) {
				setupHandler(documentation, def)
			}
			expect(mockSetupDescriptor).toMatchObject({
				name: 'publicSetup',
				params: [
					{ name: 'param', type: { name: 'string' } },
					{ name: 'paramObscure', type: { name: 'ObscureInterface' } }
				]
			})
		})

		it('should deduce the return type from setup decoration', () => {
			const src = `
      export default {
        setups: {
          /**
           * @public
           */
          twoSetup: (): number => {
            return 2;
          }
        }
      };
      `

			const def = parseTS(src)
			if (def) {
				setupHandler(documentation, def)
			}
			expect(mockSetupDescriptor).toMatchObject({
				name: 'twoSetup',
				returns: { type: { name: 'number' } }
			})
		})
	})
})
