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
	// fiber.props.children.forEach((child) => render(child, dom));
	return dom;
}

const simpleReact = { render, createElement };

// workInProgress的根节点
let wipRoot = null;
let nextUnitOfWork = null;
const isProperty = (key) => key !== "children";

function render(element, container) {
	wipRoot = {
		stateNode: container,
		props: {
			children: [element],
		},
	};
	nextUnitOfWork = wipRoot;
}

function performUnitOfWork(fiber) {
	if (!fiber.stateNode) {
		fiber.stateNode = createDom(fiber);
	}

	// if (fiber.parent) {
	// 	fiber.parent.stateNode.append(fiber.stateNode);
	// }

	const elements = fiber.props.children;
	let index = 0;
	let prevSibling = null;

	while (index < elements.length) {
		const element = elements[index];

		const newFiber = {
			type: element.type,
			props: element.props,
			parent: fiber,
			stateNode: null,
		};

		if (index === 0) {
			fiber.child = newFiber;
		} else {
			prevSibling.sibling = newFiber;
		}
		prevSibling = newFiber;
		index++;
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

function commitRoot() {
	commitWork(wipRoot.child);
	wipRoot = null;
}

function commitWork(fiber) {
	if (!fiber) {
		return;
	}
	const domParent = fiber.parent.stateNode;
	domParent.appendChild(fiber.stateNode);
	commitWork(fiber.child);
	commitWork(fiber.sibling);
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
const element = (
	<div className="simpleReact" id="container">
		<div id="text_1">Hello, World</div>
		<div id="text_2">This is my first simple React</div>
	</div>
);
const container = document.getElementById("root");
simpleReact.render(element, container);
