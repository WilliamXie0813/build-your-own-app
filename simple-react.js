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

/** @jsx simpleReact.createElement */
const element = (
	<div className="simpleReact" id="container">
		<div id="text_1">Hello, World</div>
		<div id="text_2">This is my first simple React</div>
	</div>
);
const container = document.getElementById("root");
simpleReact.render(element, container);
