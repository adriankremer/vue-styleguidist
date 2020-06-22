import classDisplayNameHandler from './classDisplayNameHandler'
import classMethodHandler from './classMethodHandler'
import classPropHandler from './classPropHandler'
import componentHandler from './componentHandler'
import displayNameHandler from './displayNameHandler'
import eventHandler from './eventHandler'
import extendsHandler from './extendsHandler'
import methodHandler from './methodHandler'
import mixinsHandler from './mixinsHandler'
import propHandler from './propHandler'
import slotHandler from './slotHandler'
import setupHandler from './setupHandler'
import { Handler } from '../parse-script'

export {
	classDisplayNameHandler,
	classMethodHandler,
	classPropHandler,
	componentHandler,
	displayNameHandler,
	eventHandler,
	extendsHandler,
	methodHandler,
	setupHandler,
	mixinsHandler,
	propHandler,
	slotHandler
}

const defaultHandlers: Handler[] = [
	displayNameHandler,
	componentHandler,
	methodHandler,
	setupHandler,
	propHandler,
	eventHandler,
	slotHandler,
	classDisplayNameHandler,
	classMethodHandler,
	classPropHandler
]

export const preHandlers: Handler[] = [
	// have to be first if they can be overridden
	extendsHandler,
	// have to be second as they can be overridden too
	mixinsHandler
]

export default defaultHandlers
