// 首次render时是mount
let isMount = true;

let workInProgressHook = null;

// App组件对应的fiber对象
const fiber = {
	// 保存该FunctionComponent对应的Hooks链表
	memoizedState: null,
	// 指向App函数
	stateNode: App,
};

function schedule() {
	// 更新前将workInProgressHook重置为fiber保存的第一个Hook
	workInProgressHook = fiber.memoizedState;
	// 触发组件render
	const app = fiber.stateNode();
	// 组件首次render为mount，以后再触发的更新为update
	isMount = false;
	return app;
}

function useState(initialState) {
	// 当前useState使用的hook会被赋值该该变量
	let hook;

	if (isMount) {
		// ...mount时需要生成hook对象
		hook = {
			queue: {
				pending: null,
			},
			memoizedState: initialState,
			next: null,
		};

		// 将hook插入fiber.memoizedState链表末尾
		if (!fiber.memoizedState) {
			fiber.memoizedState = hook;
		} else {
			workInProgressHook.next = hook;
		}
		// 移动workInProgressHook指针
		workInProgressHook = hook;
	} else {
		// ...update时从workInProgressHook中取出该useState对应的hook
		// update时找到对应hook
		hook = workInProgressHook;
		// 移动workInProgressHook指针
		workInProgressHook = workInProgressHook.next;
	}

	let baseState = hook.memoizedState;

	if (hook.queue.pending) {
		// ...根据queue.pending中保存的update更新state
		let firstUpdate = hook.queue.pending.next;

		do {
			const action = firstUpdate.action;
			baseState = action(baseState);
			firstUpdate = firstUpdate.next;
		} while (firstUpdate !== hook.queue.pending.next);

		// 清空queue.pending
		hook.queue.pending = null;
	}

	hook.memoizedState = baseState;

	return [baseState, dispatchAction.bind(null, hook.queue)];
}

function dispatchAction(queue, action) {
	// 创建update
	const update = {
		// 更新执行的函数
		action,
		// 与同一个Hook的其他更新形成链表
		next: null,
	};

	// 环状单向链表操作
	if (queue.pending === null) {
		update.next = update;
	} else {
		update.next = queue.pending.next;
		queue.pending.next = update;
	}
	//指向最后一个插入的Update
	queue.pending = update;

	// 模拟React开始调度更新
	schedule();
}

function App() {
	const [numA, setNumA] = useState(0);
	const [numB, setNumB] = useState(1);
	const [numC, setNumC] = useState(2);

	console.log(`${isMount ? "mount" : "update"} num: `, numA, numB, numC);

	return {
		onClick: () => {
			setNumA((numA) => numA + 1);
			setNumB((numB) => numB + 1);
			setNumC((numC) => numC + 1);
		},
	};
}

window.App = schedule();
