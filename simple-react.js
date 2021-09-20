let nextUnitOfWork = null;

const isProperty = (key) => key !== "children";

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

function render(element, container) {
	const dom =
		element.type === "TEXT_ELEMENT"
			? document.createTextNode("")
			: document.createElement(element.type);

	Object.keys(element.props)
		.filter(isProperty)
		.forEach((name) => {
			dom[name] = element.props[name];
		});

	element.props.children.forEach((child) => render(child, dom));
	container.appendChild(dom);
}

const simpleReact = { render, createElement };

function performUnitOfWork(fiber) {}

function workLoop(deadline) {
	let shouldYied = false;
	while (nextUnitOfWork && !shouldYied) {
		// 手动设置单元渲染任务，然后通过performUnitOfWork函数来执行后续的单元渲染任务
		// 这个函数的作用不单是执行当前的渲染任务，还能返回下个单元的渲染任务。
		nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
		// 如果剩下的事件不够渲染 则把控制权交还给浏览器主线程
		shouldYied = deadline.timeRemaining() < 1;
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
