import { useState } from "react"

function App() {
  const [response, setResponse] = useState("");

  const handleClick = async () => {
    const res = await fetch("http://localhost:30301/flask_make_graph_structure", {
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
        ]})
      });

      const data = await res.json();
      setResponse(data.canvas_positions);

    };

    return (
        <div>
            <button onClick={handleClick}>Send to backend</button>
            <p>{response}</p>
        </div>
    );
  }


export default App;