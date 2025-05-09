var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
function App() {
    const [response, setResponse] = useState("");
    const handleClick = () => __awaiter(this, void 0, void 0, function* () {
        const res = yield fetch("http://backend:30301/make_graph_structure", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                "size": 45,
                "edges": [
                    [9, 27], [9, 28], [9, 31], [27, 10],
                    [43, 1], [28, 42], [31, 32], [31, 33],
                    [42, 0], [42, 11], [16, 37], [16, 23],
                    [1, 2], [1, 12], [1, 13], [1, 14], [1, 34], [1, 35], [1, 25],
                    [37, 15], [37, 4], [15, 3], [15, 26], [15, 36], [23, 20], [23, 17],
                    [20, 18], [20, 19], [20, 21], [20, 22], [20, 24],
                    [30, 40], [40, 5], [30, 38], [38, 8], [30, 39], [39, 29],
                    [30, 41], [41, 44], [44, 6], [44, 7]
                ]
            })
        });
        const data = yield res.json();
        setResponse(data.canvas_positions);
    });
    return (_jsxs("div", { children: [_jsx("button", { onClick: handleClick, children: "Send to backend" }), _jsx("p", { children: response })] }));
}
export default App;
