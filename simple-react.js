function createElement(type, props, ...children) {
	return {
		type,
		props: {
			...props,
			children: children.map((child) =>
				typeof child === "object" ? child : createTextElement(child)
			),
		},
	};
}

function createTextElement(text) {
	return {
		type: "TEXT_ELEMENT",
		props: {
			nodeValue: text,
			children: [],
		},
	};
}

function createDom(fiber) {
	const dom =
		fiber.type === "TEXT_ELEMENT"
			? document.createTextNode("")
			: document.createElement(fiber.type);

	Object.keys(fiber.props)
		.filter(isProperty)
		.forEach((name) => {
			dom[name] = fiber.props[name];
		});
	updateDom(dom, {}, fiber.props);
	return dom;
}

const simpleReact = { render, createElement };

// workInProgress的根节点
let wipRoot = null;
let nextUnitOfWork = null;
// 指向页面上以渲染完成的节点
let currentRoot = null;
let deletions = null;

// work in progress fiber
let wipFiber = null;
let hookIndex = null;

const isEvent = (key) => key.startsWith("on");
const isProperty = (key) => key !== "children" && !isEvent(key);
const isNew = (prev, next) => (key) => prev[key] !== next[key];
const isGone = (prev, next) => (key) => !(key in next);
const isFunctionComponent = (type) => type instanceof Function;

function useState(initialState) {
	const oldHook =
		wipFiber.alternate &&
		wipFiber.alternate.hooks &&
		wipFiber.alternate.hooks[hookIndex];

	const hook = {
		state: oldHook ? oldHook.state : initialState,
		queue: [],
	};

	const actions = oldHook ? oldHook.queue : [];
	actions.forEach((action) => {
		if (action instanceof Function) {
			hook.state = action(hook.state);
		} else {
			hook.state = action;
		}
	});

	const setState = (action) => {
		hook.queue.push(action);
		console.log("hook : ", hook);
		wipRoot = {
			stateNode: currentRoot.stateNode,
			props: currentRoot.props,
			alternate: currentRoot,
		};
		nextUnitOfWork = wipRoot;
		deletions = [];
	};

	wipFiber.hooks.push(hook);
	hookIndex++;
	return [hook.state, setState];
}

function useEffect(callback, initialState) {}

function updateFunctionComponent(fiber) {
	wipFiber = fiber;
	hookIndex = 0;
	wipFiber.hooks = [];

	let node = fiber.type(fiber.props);
	// while (typeof node.type !== "string") {
	// 	node = node.type(node.props);
	// }
	reconcileChildren(fiber, [node]);
}

function updateHostComponent(fiber) {
	if (!fiber.stateNode) {
		fiber.stateNode = createDom(fiber);
	}

	const elements = fiber.props.children;
	reconcileChildren(fiber, elements);
}

function render(element, container) {
	wipRoot = {
		stateNode: container,
		props: {
			children: [element],
		},
		alternate: currentRoot,
	};
	deletions = [];
	nextUnitOfWork = wipRoot;
}

function performUnitOfWork(fiber) {
	// console.log("fiber : ", fiber);
	if (isFunctionComponent(fiber.type)) {
		updateFunctionComponent(fiber);
	} else {
		updateHostComponent(fiber);
	}

	// 深度优先遍历，先遍历所有的子节点，如果子节点遍历完了则开始遍历兄弟节点
	// 如果兄弟节点也没有，则返回父节点遍历叔叔节点。。。以此类推
	if (fiber.child) {
		return fiber.child;
	}

	let nextFiber = fiber;
	while (nextFiber) {
		if (nextFiber.sibling) {
			return nextFiber.sibling;
		}
		nextFiber = nextFiber.parent;
	}
}

function reconcileChildren(wipFiber, elements) {
	// console.log("wipFiber : ", wipFiber);
	// console.log("elements : ", elements);
	// console.log("---------------------------------------------");
	let index = 0;
	let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
	let prevSibling = null;

	while (index < elements.length || oldFiber != null) {
		const element = elements[index];
		const smaeType = oldFiber && element && element.type === oldFiber.type;
		let newFiber = null;
		//Update the node
		if (smaeType) {
			newFiber = {
				type: oldFiber.type,
				props: element.props,
				parent: wipFiber,
				stateNode: oldFiber.stateNode,
				alternate: oldFiber,
				effectTag: "UPDATE",
			};
		}

		// Add the node
		if (element && !smaeType) {
			newFiber = {
				type: element.type,
				props: element.props,
				parent: wipFiber,
				stateNode: null,
				alternate: null,
				effectTag: "PLACEMENT",
			};
		}

		// Delete the node
		if (oldFiber && !smaeType) {
			oldFiber.effectTag = "DELETION";
			deletions.push(oldFiber);
		}

		if (oldFiber) {
			oldFiber = oldFiber.sibling;
		}

		if (index === 0) {
			wipFiber.child = newFiber;
		} else if (element) {
			prevSibling.sibling = newFiber;
		}
		prevSibling = newFiber;
		index++;
	}
}

function commitRoot() {
	//先处理删除节点
	deletions.forEach(commitWork);
	commitWork(wipRoot.child);
	currentRoot = wipRoot;
	wipRoot = null;
}

function commitWork(fiber) {
	if (!fiber) {
		return;
	}
	let domParentFiber = fiber.parent;
	while (!domParentFiber.stateNode) {
		domParentFiber = domParentFiber.parent;
	}

	const domParent = domParentFiber.stateNode;

	if (fiber.effectTag === "PLACEMENT" && fiber.stateNode != null) {
		domParent.appendChild(fiber.stateNode);
	} else if (fiber.effectTag === "UPDATE" && fiber.stateNode != null) {
		updateDom(fiber.stateNode, fiber.alternate.props, fiber.props);
	} else if (fiber.effectTag === "DELETION") {
		commitDeletion(fiber, domParent);
	}

	commitWork(fiber.child);
	commitWork(fiber.sibling);
}

function commitDeletion(fiber, domParent) {
	if (fiber.stateNode) {
		domParent.removeChild(fiber.stateNode);
	} else {
		commitDeletion(fiber.child, domParent);
	}
}

function updateDom(dom, prevProps, nextProps) {
	// Remove old properties
	Object.keys(prevProps)
		.filter(isProperty)
		.filter(isGone(prevProps, nextProps))
		.forEach((name) => {
			dom[name] = "";
		});

	// Remove old or changed event listeners
	Object.keys(prevProps)
		.filter(isEvent)
		.filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key))
		.forEach((name) => {
			const eventType = name.toLowerCase().substring(2);
			dom.removeEventListener(eventType, prevProps[name]);
		});

	// Add old properties
	Object.keys(nextProps)
		.filter(isProperty)
		.filter(isNew(prevProps, nextProps))
		.forEach((name) => {
			dom[name] = nextProps[name];
		});

	// Add new event listeners
	Object.keys(nextProps)
		.filter(isEvent)
		.filter(isNew(prevProps, nextProps))
		.forEach((name) => {
			const eventType = name.toLowerCase().substring(2);
			dom.addEventListener(eventType, nextProps[name]);
		});
}

function workLoop(deadline) {
	let shouldYied = false;
	while (nextUnitOfWork && !shouldYied) {
		// 手动设置单元渲染任务，然后通过performUnitOfWork函数来执行后续的单元渲染任务
		// 这个函数的作用不单是执行当前的渲染任务，还能返回下个单元的渲染任务。
		nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
		// 如果剩下的事件不够渲染 则把控制权交还给浏览器主线程
		shouldYied = deadline.timeRemaining() < 1;
	}

	// 完成所有渲染单位后，提交整个fiber
	if (!nextUnitOfWork && wipRoot) {
		commitRoot();
	}
	requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop);

/** @jsx simpleReact.createElement */
function App(props) {
	const [countA, setCountA] = useState(0);
	const [countB, setCountB] = useState(0);
	return (
		<h1 id="text_3">
			<button
				onClick={() => {
					let newCount = countA + 1;
					setCountA(newCount);
				}}
			>
				Click Me Plus!!!
			</button>
			<button
				onClick={() => {
					let newCount = countB - 1;
					setCountB(newCount);
				}}
			>
				Click Me Minus!!!
			</button>
			<div>
				I am {props.name}, countA: {countA}, countB: {countB}
			</div>
		</h1>
	);
}

const element = (
	<div className="simpleReact" id="text_0">
		<div id="text_1">
			Hello, World
			<div id="text_2">This is my first simple React</div>
			<App name="William Xie" />
		</div>
	</div>
);
const container = document.getElementById("root");
simpleReact.render(<App name="William Xie" />, container);
