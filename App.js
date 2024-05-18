import './App.css';
import {useState, useRef, useEffect} from 'react';
import * as d3 from 'd3';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Slider from '@mui/material/Slider';
//=============================================================================

function App() {
  
  const darkTheme = createTheme({
    palette: {
      mode: 'dark',
    },
  });

  const svgRef = useRef(null);
  const [rawData, setRawData] = useState(null);
  const [location, setLocation] = useState(null);
  const [items, setItems] = useState(null);
  const [value, setValue] = useState(null);
  const urlref = useRef(null);

//=============================================================================
//fetching location list
  useEffect(() => {
    fetch('http://192.168.1.7:5000/site_list')
      .then((res) => {
        return res.json();
      })
      .then((data) => {
        setLocation(data);
      });
  }, []);

//=============================================================================
//inputting location list into autocomplete search
  useEffect(() => {
    let x = []
    if(!location) {
      return;
    };

    for (let i=0; i+1 <= location.length; i++) {
      x.push({
        label: location[i].name,
        key: i
      });
    };
    setItems(x);
  }, [location]);

//=============================================================================
//fetching data for graph when a location is selected
  useEffect(() => {
    if(!value) {
      return;
    };

    let url1 = 'http://192.168.1.7:5000/location?id='
    let urlRefresh = 'http://192.168.1.7:5000/location/refresh?id='

    for (let i = 0; i+1 <= location.length; i++) {
      if (value.label == location[i].name) {
        urlref.current = location[i].url;
      };
    };

    fetch(url1 + urlref.current)
        .then((res) => {
          return res.json();
        })
        .then((data) => {
          if (data.length == 0) {
            fetch(urlRefresh + urlref.current)
            .then((res) => {
              return res.json();
            })
            .then((data2) => {
              if (data2.length == 0) {
                fetch(url1 + urlref.current)
                  .then((res) => {
                    return res.json();
                  })
                  .then((data3) => {
                    setRawData(data3);
                  });
              }
            })
          }
          else {
            setRawData(data);
          };
        });
    }, [value])

//=============================================================================
//drawing graph
  useEffect(() => {
    if (!rawData) {
      return;
    };

    if (rawData.length == 0) {
      const text = document.createTextNode('no data')
      document.getElementById('main').appendChild(text);
    };

  const links = [...rawData[1]];
  const nodes = [...rawData[0]];

  let location = '';

  for (let i = 0; i+1 <= nodes.length; i++) {
    if(nodes[i].type == 'rtu') {
      location = nodes[i].location;
    };
  };

  const width = window.innerWidth;
  const height = window.innerHeight;

  const svg = d3.select(svgRef.current)
  .attr('width', width)
  .attr('height', height);

  svg.selectAll("*").remove();
    
//=============================================
//simulation
  const simulation = d3.forceSimulation(nodes)
    .force('charge', d3.forceManyBody().strength(-25)) 
    .force('x', d3.forceX(width / 2).strength(0.07))
    .force('y', d3.forceY(height / 2).strength(0.07))
    .force('collide', d3.forceCollide().radius(47))
    .force('link', d3.forceLink(links)
    .id(link => link.id)
    .distance(25)
    .strength(0.1))
    .on('tick', () => {
      nodeElements
        .attr('cx', node => node.x)
        .attr('cy', node => node.y)
      linkElements
        .attr('x1', link => link.source.x)
        .attr('y1', link => link.source.y)
        .attr('x2', link => link.target.x)
        .attr('y2', link => link.target.y)
      textElements
        .attr('x', node => node.x)
        .attr('y', node => node.y)
      });
//=============================================
//setting style
    function getNodeColor(node) {
      if (node.location != location) {
        return 'rgb(232, 94, 28)'
      }
      else if (node.type == 'rtu') {
      return 'rgb(25, 171, 255)'
      }
      else {
        return 'rgb(237, 153, 1)'
      };

    };

    function getLineStyle(link) {
      if(link.direct == true) {
        return ''
      }
      else {return '5 2'}
    }
//=============================================    
//rendering



  const linkElements = svg.append('g')
  .selectAll('line')
  .data(links)
  .enter().append('line')
    .attr('stroke-width', 1.5)
    .attr('stroke', 'white')
    .attr('stroke-dasharray', getLineStyle);

  const graph = svg.selectAll('node')
  .data(nodes)
  .enter().append('g')
  .attr('class', function(d) { return 'node' + " " + d.id})
  .on('click', function (d) {

    function getConnectedNodesRadius (node) {
      let x = new Set ();
      let big = false;
      if (node.id == d.currentTarget.__data__.id) {
        return 31;
      }
      else {
        for (let i = 0; i + 1 <= links.length; i++) {
          if (d.currentTarget.__data__.id == links[i].source.id) {
            x.add(links[i].target.id)
          };
          if (d.currentTarget.__data__.id == links[i].target.id) {
            x.add(links[i].source.id)
          };
        };
        let y = [...x]
        for (let i = 0; i + 1 <= y.length; i++) {
          if (node.id == y[i]) {
            big = true;
          };
        };
        if (big == true) {
          return 31;
        }
        else {
          return 20;
        };
      };
    };

    function getConnectedNodesFontSize (node) {
      let x = new Set ();
      let big = false;
      if (node.id == d.currentTarget.__data__.id) {
        return 16;
      }
      else {
        for (let i = 0; i + 1 <= links.length; i++) {
          if (d.currentTarget.__data__.id == links[i].source.id) {
            x.add(links[i].target.id)
          };
          if (d.currentTarget.__data__.id == links[i].target.id) {
            x.add(links[i].source.id)
          };
        };
        let y = [...x]
        for (let i = 0; i + 1 <= y.length; i++) {
          if (node.id == y[i]) {
            big = true;
          };
        };
        if (big == true) {
          return '16';
        }
        else {
          return '12';
        };
      };
    };

    function getConnectedNodesOpacity (node) {
      let x = new Set ();
      let big = false;
      if (node.id == d.currentTarget.__data__.id) {
        return 16;
      }
      else {
        for (let i = 0; i + 1 <= links.length; i++) {
          if (d.currentTarget.__data__.id == links[i].source.id) {
            x.add(links[i].target.id)
          };
          if (d.currentTarget.__data__.id == links[i].target.id) {
            x.add(links[i].source.id)
          };
        };
        let y = [...x]
        for (let i = 0; i + 1 <= y.length; i++) {
          if (node.id == y[i]) {
            big = true;
          };
        };
        if (big == true) {
          return '1';
        }
        else {
          return '0.7';
        };
      };
    };

    nodeElements.attr('r', getConnectedNodesRadius).attr('opacity', getConnectedNodesOpacity)
    textElements.attr('font-size', getConnectedNodesFontSize)
    linkElements.style('stroke-width', function(l) {
      if(l.source.id == d.currentTarget.__data__.id || l.target.id == d.currentTarget.__data__.id) {
      return 3;
      }
      else {
        return 1.5;
      };
    });
   
    linkElements.style('opacity', function(l) {
      if(l.source.id == d.currentTarget.__data__.id || l.target.id == d.currentTarget.__data__.id) {
        return 1;
      }
      else {
        return 0.3;
      };
      });
    
  })
  .on('mouseout', function (d) {
    nodeElements.attr('r', 26).attr('opacity', 1);
    textElements.attr('font-size', '15');
    linkElements.style('stroke-width', 1.5);
    linkElements.style('opacity', 1);
    });

  const nodeElements = graph.append('circle')
    .attr('r', 26)
    .attr('fill', getNodeColor)
      
  const textElements = graph.append('text')
    .text(node => node.id)
    .attr('font-size', 15)
    .attr('fill', 'black')
    .attr('text-anchor', 'middle')
    .attr('dx', 0)
    .attr('dy', '.35em');

  }, [rawData]);
//=============================================================================
//refresh button
const handleClick = event => {
  let url1 = 'http://192.168.1.7:5000/location?id='
  let urlRefresh = 'http://192.168.1.7:5000/location/refresh?id='

    fetch(urlRefresh + urlref.current)
    .then((res) => {
      return res.json();
    })
    .then((data) => {
      fetch(url1 + urlref.current)
      .then((res) => {
        return res.json();
      })
      .then((data2) => {
        console.log(data2);
        setRawData(data2);
      });
    });
};

//=============================================================================
  return (
    <div id='main' className='App' style={{width: window.innerWidth, height: window.innerHeight}}>
      <div style={{width: 480, height: 100}}>
      <div style={{width: 120, padding: 20, float: 'right'}}>
          <ThemeProvider theme={darkTheme}>
            <Slider
            step={20}
            min={0}
            max={140}
            />
            <Button
            onClick={handleClick}
            disabled={rawData == null ? true : false} 
            variant='outlined'
            size='large'>
              refresh
            </Button>
          </ThemeProvider>
        </div>
        <div style={{width: 300, padding: 20}}>
          <ThemeProvider theme={darkTheme}>
            <Autocomplete
              value={value}
              onChange={(event, newValue) => {
                setValue(newValue);
              }}
              disablePortal
              options={items}
              sx={{ width: 300 }}
              renderInput={(params) => <TextField {...params} label="location"/>}
            /> 
          </ThemeProvider>
        </div> 
      </div>
      <svg ref={svgRef}></svg>
    </div>
  )
};

export default App;