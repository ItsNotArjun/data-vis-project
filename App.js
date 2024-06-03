import './App.css';
import {useState, useRef, useEffect} from 'react';
import * as d3 from 'd3';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Slider from '@mui/material/Slider';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Collapse } from '@mui/material';
//=============================================================================
function App() {
  
  const lightTheme = createTheme({
    palette: {
      mode: 'light',
    },
  });

  const svgRef = useRef(null);
  const [fetchedData, setFetchedData] = useState(null);
  const [renderData, setRenderData] = useState(null);
  const [locations, setLocations] = useState(null);
  const [items, setItems] = useState(null);
  const [value, setValue] = useState(null);
  const [sliderValue, setSliderValue] = useState(80);
  const [rows, setRows] = useState([]);
  const [connected, setConnected] = useState([]);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const urlref = useRef(null);
  const marks = [{label:'2h', value:'0'}, {label:'4h', value:'20'}, {label:'6h', value:'40'}, {label:'8h', value:'60'}, {label:'10h', value:'80'}, {label:'12h', value:'100'}, {label:'1d', value:'120'}, {label:'2d', value:'140'}, {label:'3d', value:'160'}];
  const currentTime = Date.now();

  function createData(location, asset) {
    return [{location, asset}];
  };

//=============================================================================
//fetching location list
  useEffect(() => {
    setIsLoading(true);
    fetch('http://192.168.1.9:5000/site_list')
      .then((res) => {
        return res.json();
      })
      .then((data) => {
        setLocations(data);
        setIsLoading(false);
      });
  }, []);

//=============================================================================
//inputting location list into autocomplete search
  useEffect(() => {
    let x = [];
    if(!locations) {
      return;
    };

    for (let i=0; i+1 <= locations.length; i++) {
      x.push({
        label: locations[i].name,
        key: i
      });
    };
    setItems(x);
  }, [locations]);

//=============================================================================
//fetching data for graph when a location is selected
  useEffect(() => {
    if(!value) {
      return;
    };

    let url1 = 'http://192.168.1.9:5000/location?id=';
    let urlRefresh = 'http://192.168.1.9:5000/location/refresh?id=';

    for (let i = 0; i+1 <= locations.length; i++) {
      if (value.label == locations[i].name) {
        urlref.current = locations[i].url;
      };
    };

    setIsLoading(true);
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
                    setFetchedData(data3);
                    setIsLoading(false);
                  });
              };
            });
          }
          else {
            setFetchedData(data);
            setIsLoading(false);
          };
        });
    }, [value]);

//=============================================================================
//slider
  useEffect(() => {
    if (!fetchedData) {
      return;
    };
    const hour = 3600000;
    const nodes = fetchedData[0];
    const links = fetchedData[1];
    let tempLinks = [];
    if (sliderValue <= 100) {
    for (let i = 0; i + 1 <= 6; i ++) {
        if (sliderValue == i * 20) {
          for (let j = 0; j + 1 <= links.length; j++) {
            if (currentTime - ((2 * (i + 1)) * hour) <= links[j].lastUpload) {
              tempLinks.push(links[j]);
            };
          };
          let x = [];
          x.push(nodes);
          x.push(tempLinks);
          setRenderData(x);
        };
      };
    }
    else {
      for (let i = 0; i + 1 <= 3; i++) {
        if (sliderValue == (i * 20) + 120) {
          for (let j = 0; j + 1 <= links.length; j++) {
            if (currentTime - ((24 * (i + 1)) * hour) <= links[j].lastUpload) {
              tempLinks.push(links[j]);
            };
          };
          let x = [];
          x.push(nodes);
          x.push(tempLinks);
          setRenderData(x);
        };
      };
    };

  }, [sliderValue, value, fetchedData])
//=============================================================================
//drawing graph
  useEffect(() => {
    if (!renderData) {
      return;
    };

    if (renderData.length == 0) {
      const text = document.createTextNode('no data');
      document.getElementById('main').appendChild(text);
    };

  const nodes = [...renderData[0]];
  const links = [...renderData[1]];

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
        .attr('y', node => node.y);
      });

//=============================================
//setting style
    function getNodeColor(node) {
      if (node.location != location) {
          return '#ff9d00';
      }
      else if (node.type == 'rtu') {
        let out = true;
          for (let i = 0; i + 1 <= links.length; i++) {
            if (node == links[i].source) {
              out = false;
            }
            else if (node == links[i].target) {
              out = false;
            }
          }
        if (out == true) {
          return '#db3e00';
        }
        else {
          return '#19abff';
        };
      }
      else {
        let out = true;
          for (let i = 0; i + 1 <= links.length; i++) {
            if (node == links[i].source) {
              out = false;
            }
            else if (node == links[i].target) {
              out = false;
            }
          }
        if (out == true) {
          return '#db3e00';
        }
        else {
          return '#ffd900';
        };
      };
    };

    function getLineStyle(link) {
      if(link.direct == true) {
        return '';
      }
      else {return '5 2';};
    };

    function getOutline(node) {
      let out = true;
      for (let i = 0; i + 1 <= links.length; i++) {
          if (node == links[i].source) {
            out = false;
          }
          else if (node == links[i].target) {
            out = false;
          }
        }
      if (out == true) {
        return 3;
      }
      else {
        return 0;
      };
    };

    function getStrokeColour (node) {
      if (node.location != location) {
        return '#ffd900'
      }
      else if (node.type == 'rtu') {
        return '#19abff';
      }
      else {return '#ff9d00'} 
    }

//=============================================    
//rendering
  const linkElements = svg.append('g')
  .selectAll('line')
  .data(links)
  .enter().append('line')
    .attr('stroke-width', 1.5)
    .attr('stroke', '#909090')
    .attr('stroke-dasharray', getLineStyle);

  const graph = svg.selectAll('node')
  .data(nodes)
  .enter().append('g')
  .attr('class', function(d) { return 'node' + " " + d.id})
  .on('click', function (d) {
//---------------------------------------------------------------------------
//for table
    function getLocationName (data) {
      for (let i = 0; i + 1 <= locations.length; i++) {
        if (data.currentTarget.__data__.location == locations[i].url) {
          return locations[i].name;
        };
      };
    };

    function getAssetId (data) {
      return data.currentTarget.__data__.assetName
    };

    function getConnectedNodes (data) {
      let x = new Set ();
      let empty = true;
      for (let i = 0; i + 1 <= links.length; i++) {
        if (data.currentTarget.__data__.id == links[i].source.id) {
          empty = false;
          for (let j = 0; j + 1 <= nodes.length; j++) {
            if(links[i].target.id == nodes[j].id){
              x.add(nodes[j].assetName)
            };
          };
        };
        if (data.currentTarget.__data__.id == links[i].target.id) {
          empty = false;
          for (let j = 0; j + 1 <= nodes.length; j++) {
            if(links[i].source.id == nodes[j].id){
              x.add(nodes[j].assetName)
            };
          };
        };
      };
      if ( empty == true) {
        return [{id: '-'}];
      }
      else {
        let y = [...x];
        let z = [];
        for (let i = 0; i + 1 <= y.length; i++) {
          z.push({id: y[i]});
        };
        return z;
      };
    };

    

    setRows((createData(getLocationName(d), getAssetId(d))))
    setConnected(getConnectedNodes(d))
//---------------------------------------------------------------------------
//for clicked effect
    function getConnectedNodesRadius (node) {
      let x = new Set ();
      let big = false;
      if (node.id == d.currentTarget.__data__.id) {
        return 31;
      }
      else {
        for (let i = 0; i + 1 <= links.length; i++) {
          if (d.currentTarget.__data__.id == links[i].source.id) {
            x.add(links[i].target.id);
          };
          if (d.currentTarget.__data__.id == links[i].target.id) {
            x.add(links[i].source.id);
          };
        };
        let y = [...x];
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
            x.add(links[i].target.id);
          };
          if (d.currentTarget.__data__.id == links[i].target.id) {
            x.add(links[i].source.id);
          };
        };
        let y = [...x];
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
            x.add(links[i].target.id);
          };
          if (d.currentTarget.__data__.id == links[i].target.id) {
            x.add(links[i].source.id);
          };
        };
        let y = [...x];
        for (let i = 0; i + 1 <= y.length; i++) {
          if (node.id == y[i]) {
            big = true;
          };
        };
        if (big == true) {
          return '1';
        }
        else {
          return '0.1';
        };
      };
    };

    function getNodeStroke (node) {
      if (node.id == d.currentTarget.__data__.id) {
        return 2;
      }
      else { return 0}
    }

    nodeElements.attr('r', getConnectedNodesRadius).attr('opacity', getConnectedNodesOpacity).attr('stroke', 'white').attr('stroke-width', getNodeStroke);
    textElements.attr('font-size', getConnectedNodesFontSize);
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
        return 0.1;
      };
    });
  })
//---------------------------------------------------------------------------
  .on('mouseout', function (d) {
    nodeElements.attr('r', 26).attr('opacity', 1).attr('stroke-width', getOutline).attr('stroke', getStrokeColour);
    textElements.attr('font-size', '15');
    linkElements.style('stroke-width', 1.5);
    linkElements.style('opacity', 1);
    });

  const nodeElements = graph.append('circle')
    .attr('r', 26)
    .attr('fill', getNodeColor)
    .attr('stroke', getStrokeColour)
    .attr('stroke-width', getOutline)
      
  const textElements = graph.append('text')
    .text(node => node.id)
    .attr('font-size', 15)
    .attr('fill', 'black')
    .attr('text-anchor', 'middle')
    .attr('dx', 0)
    .attr('dy', '.35em');

  }, [renderData]);

//=============================================================================
//refresh button
const handleClick = event => {
  let url1 = 'http://192.168.1.9:5000/location?id='
  let urlRefresh = 'http://192.168.1.9:5000/location/refresh?id='

    setIsLoading(true);
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
        setFetchedData(data2);
        setIsLoading(false);
      });
    });
};

//=============================================================================
  return (
    <div id='main' className='App' style={{width: window.innerWidth, height: window.innerHeight}}>
        <div style={{float: 'right'}}>
          <ThemeProvider theme={lightTheme}>
            <div style={{float: 'left', paddingTop:10}}>
              <Table sx={{ maxwidth: 450 }} size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell align='left'>Location Name</TableCell>
                    <TableCell align='left'>Asset Name</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={row.name}
                      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                      >
                      <TableCell align='left'>{row.location}</TableCell>
                      <TableCell align='left'>{row.asset}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div style={{width: 250, float: 'right'}}>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell align='left'>Connected Nodes</TableCell>
                    <TableCell align='right'>
                      <IconButton
                        aria-label="expand row"
                        size="small"
                        onClick={() => setOpen(!open)}>
                          {open ? <KeyboardArrowUpIcon/> : <KeyboardArrowDownIcon/>}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <Collapse in={open} timeout="auto" unmountOnExit>
                  <TableBody>
                    {connected.map((row) => (
                      <TableRow
                      key={row.name}
                      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                      >
                      <TableCell>{row.id}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Collapse>
              </Table>
            </div>
          </ThemeProvider>
        </div>  

        <div style={{ width:743, height: 100}}>
          <div style={{ padding: 20, paddingTop: 27, paddingRight: 27,paddingLeft: 18, float: 'right'}}>
              <div style={{float: 'left'}}>
              <Box sx={{ width: 200, paddingBottom: 2, paddingLeft: 1}}>
                <Slider
                  size='small'
                  valueLabelDisplay='off'
                  defaultValue={80}
                  track={false}
                  step={20}
                  min={0}
                  max={160}
                  marks={marks}
                  onChange={(event, newValue) => {
                    setSliderValue(newValue);
                  }}
                  disabled={fetchedData == null ? true : false}
                />
              </Box>
              </div>
              <div style={{float: 'right', paddingTop: 7, paddingLeft: 23}}>
                <LoadingButton
                  onClick={handleClick}
                  endIcon={<RefreshIcon />}
                  loading={isLoading}
                  loadingPosition="end"
                >
                  <span>Refresh</span>
                </LoadingButton>
                {/* <Button
                  onClick={handleClick}
                  disabled={fetchedData == null ? true : false} 
                  variant='outlined'
                  size='large'
                  startIcon={<RefreshIcon/>}>
                  refresh
                </Button> */}
              </div>
          </div>

          <div style={{width: 300, padding: 20, paddingTop: 27}}>
            <ThemeProvider theme={lightTheme}>
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

          {/* { isLoading 
            ? <div style={{position:'absolute', bottom:0, backgroundColor: '#e6faff', height: 25, width: window.innerWidth, borderRadius: 3}}>
               <b style={{color: '#002733', paddingLeft: 7}}>loading...</b>
              </div>
            : null
          } */}
            
        </div>
      <div style={{ position: 'fixed' }}>
        <svg ref={svgRef}></svg>
      </div>
    </div>
  )
};

export default App;
