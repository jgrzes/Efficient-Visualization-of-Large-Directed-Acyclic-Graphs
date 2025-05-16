import { useRef, useState } from "react"
import "./style.css"
import { Graph, GraphConfigInterface } from "@cosmograph/cosmos";

function App() {
  // const div = document.getElementById("graph") as HTMLDivElement;
  // let graph: Graph;
  // const config: GraphConfigInterface = {
  //   spaceSize: 4096, 
  //   backgroundColor: "#151515",
  //   pointSize: 1, 
  //   pointColor: "00FF00",
  //   linkWidth: 0.1, 
  //   linkArrows: true,
  //   linkColor: "#00AA00",
  //   enableDrag: true, 
  //   hoveredPointRingColor: "#FF0000",
  //   onClick: (
  //     index: number | undefined,
  //     pointPos: [number, number] | undefined, 
  //     event: MouseEvent
  //   ) => {
  //     if (index !== undefined) {
  //       graph.selectPointByIndex(index);
  //       graph.zoomToPointByIndex(index);
  //     } else {
  //       graph.unselectPoints();
  //     }

  //     console.log("Cliked point index: ", index);
  //   }
  // };

  // graph = new Graph(div, config);

  const divRef = useRef<HTMLDivElement | null>(null);
  const [graph, setGraph] = useState<Graph | null>(null);
  // const [response, setResponse] = useState("");

  const handleClick = async () => {
    try {
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
        console.log(data);
        // setResponse(data.canvas_positions);

        if (divRef.current) {
          const config: GraphConfigInterface = {
            spaceSize: 4096, 
            backgroundColor: "#151515",
            pointSize: 1, 
            pointColor: "00FF00",
            linkWidth: 0.1, 
            linkArrows: true,
            linkColor: "#00AA00",
            enableDrag: true, 
            hoveredPointRingColor: "#FF0000",
            onClick: (
              index: number | undefined,
              pointPos: [number, number] | undefined, 
              event: MouseEvent
            ) => {
              if (index !== undefined) {
                graph?.selectPointByIndex(index);
                graph?.zoomToPointByIndex(index);
              } else {
                graph?.unselectPoints();
              }

              console.log("Cliked point index: ", index);
            }
          }

          const newGraph = new Graph(divRef.current, config);
          setGraph(newGraph);
          let pointPositions = [];

          
          newGraph.setPointPositions(data.canvas_positions);
          newGraph.render();
        }
    
    } catch (error) {
      console.error("Fetch error: ", error);
    }
  };

  // const handleClick = async () => {
  //   try {
  //     const res = await fetch("http://localhost:30301/flask_make_graph_structure", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         "size": 45,
  //         "edges": [
  //           [9, 27], [9, 28], [9, 31], [27, 10],
  //           [43, 1], [28, 42], [31, 32], [31, 33],
  //           [42, 0], [42, 11], [16, 37], [16, 23],
  //           [1, 2], [1, 12], [1, 13], [1, 14], [1, 34], [1, 35], [1, 25],
  //           [37, 15], [37, 4], [15, 3], [15, 26], [15, 36], [23, 20], [23, 17],
  //           [20, 18], [20, 19], [20, 21], [20, 22], [20, 24],
  //           [30, 40], [40, 5], [30, 38], [38, 8], [30, 39], [39, 29],
  //           [30, 41], [41, 44], [44, 6], [44, 7]
  //         ]})
  //       });

  //       const data = await res.json();
  //       console.log(data);
  //       // setResponse(data.canvas_positions);
    
  //   } catch (error) {
  //     console.error("Fetch error: ", error);
  //   }

  //   };

    return (
        <div>
            <button onClick={handleClick}>Send to backend</button>
            {/* <p>{response}</p> */}
            <div id="graph" ref={divRef} style={{ width: "800px", height: "600px" }}></div>
        </div>
    );
  }


export default App;