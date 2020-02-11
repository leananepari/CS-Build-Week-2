import React, { useEffect, useState } from 'react';
import './App.css';
import axiosWithAuth from './authentication/axiosWithAuth';


// This code was used to map the rooms, collect treasure, 
// find needed rooms to change the name and mine a coin.
// * to solve the puzzle which tells you where to mine a coin, i used modified my LS8 code from Computer Architecture build week by adding one more instruction.
// * to mine a coin i modified my blockchain code from previous weeks to look for a needed proof.
// Eventually this code will be handled in Django BE server and this react part will be displaying the map
// and handling user actions.

function App() {

  useEffect(() => {

    let rooms = JSON.parse(localStorage.getItem('roomsInfo'));
    for (let i = 0; i < rooms.length; i++) {
      for (let key in rooms[i]) {
        let name = rooms[i][key].title;
        // console.log(rooms[i][key])
        if (name.toLowerCase().search(new RegExp('pirate')) !== -1) {
          console.log('FOUND ROOM: ', name, rooms[i][key])
        }
      }

    }
    // Use mapRooms function to map 500 rooms and save the graph to the local storage.
    // Takes around 4 hours, that is with wise explorer applied when possible
    // mapRooms();

    let graphArr = JSON.parse(localStorage.getItem('roomsGraph'));
    let graph = graphArr[0];
    // console.log('GRAPH here: ', graph)

    //Use find path to map the path from A to B. Applies wise expoler.
    let path = findPath(355, 35, graph);
    // Then use walkThePath function
    walkThePath(path)
  }, [])


  const findPath = (start, end, graph) => {
    let queue = [[{'room':start, 'wise_explorer': undefined}]];
    let visited = {};

    while(queue.length > 0) {
      let path = queue.shift();
      let node = path[path.length -1]['wise_explorer'] !== undefined ? path[path.length -1]['wise_explorer'] : path[path.length -1]['room'];

      if (!visited.hasOwnProperty(node)) {
        visited[node] = 1;
        if (node === end) {
          return path;

        } else {
          for (let key in graph[node]) {
            let newPath = path.slice();
            newPath.push({'room': node, 'direction': key, 'wise_explorer': graph[node][key]});
            queue.unshift(newPath);
          }
        }
      }
    }
  }

  const walkThePath = (path) => {

    let walkPath = path;
    let items = [];
    let cooldown = 0;

    function loop() {
      if (walkPath.length > 0) {
        let vertex = walkPath.shift();
        let body = {"direction":`${vertex.direction}`};
        if (vertex.wise_explorer !== undefined) {
          body['next_room_id'] = vertex.wise_explorer.toString();
        }
          axiosWithAuth()
          .post('https://lambda-treasure-hunt.herokuapp.com/api/adv/move/', body)
          .then(res => {
            cooldown = res.data.cooldown * 1000;

            if (res.data.items.length > 0) {
              for (let i = 0; i < res.data.items.length; i++) {
                items.push(res.data.items[i])
              }
            }
            if (items.length > 0) {
              setTimeout(() => {

                let treasure = items.pop();

                //first check the status to make sure you can pick up the item
                axiosWithAuth()
                .post('https://lambda-treasure-hunt.herokuapp.com/api/adv/status/')
                .then(res => {
                  console.log('STATUS response ', res.data)
                  //add returned cooldown to the existing cooldown 
                  cooldown = res.data.cooldown * 1000
  
                  //if we can pick up the item, pick it up
                  if (res.data.encumbrance < 8) {
                    setTimeout(() => {
                      axiosWithAuth()
                      .post('https://lambda-treasure-hunt.herokuapp.com/api/adv/take/', {"name":`${treasure}`})
                      .then(res => {
                        console.log('TREASURE response ', res.data)
                        //add returned cooldown to existing cooldown
                        cooldown = res.data.cooldown * 1000;
                        //wait and then move on
                        setTimeout(() => {
                          loop();
                        }, cooldown)
    
                      })
                      .catch(err => {
                          cooldown -= res.data.cooldown * 1000;
                          console.log('ERROR TREASURE', err)
                          setTimeout(() => {
                            loop();
                          }, cooldown)
                      })
                    }, cooldown)
                  } 
                  //can't pick up the item, move on
                  else {
                    setTimeout(() => {
                      loop();
                    }, cooldown)
                  }
                })
            
                .catch(err => {
                    console.log(err)
                })
                
              }, cooldown)

            } 
            //no treasure in the room, move on
            else {
              setTimeout(() => {
                loop()
              }, cooldown)
            }

          })
          .catch(err => {
              console.log(err)
          })


      } else {
        console.log('FINISHED ====================')
      }      
    }

    loop()
    
  }

  const mapRooms = () => {

    let graph = {}
    let importantRooms = {}
    let roomsInfo = {}

    let rooms = 0;
    let cooldown = 0;
    let items = [];

    let stack = [{'room': 0, 'direction': 'w', 'wise_explorer': false},
                 {'room': 0, 'direction': 'n', 'wise_explorer': false},
                 {'room': 0, 'direction': 's', 'wise_explorer': false},
                 {'room': 0, 'direction': 'e', 'wise_explorer': false},
                ];
    // let stack = [{'room': 55, 'direction': 'w', 'wise_explorer': false},
    //             ];
    let visited = {};
    let currentRoom = 0;
    // let currentRoom = 55;
    let directions = {
      'n': 's',
      's': 'n',
      'e': 'w',
      'w': 'e'
    }

    function loop() {
      if (stack.length > 0) {
      // if (rooms <= 10) {
        console.log('ROOMS: ', rooms)
        rooms++;
        let vertex = stack.pop();
        
        //===========================================
        if (vertex.room !== 467) {

        if (!graph.hasOwnProperty(currentRoom)) {
          graph[currentRoom] = {}
        }

        if (currentRoom === vertex.room) {
          let body = {"direction":`${vertex.direction}`};
          if (vertex.wise_explorer !== false) {
            body['next_room_id'] = vertex.wise_explorer.toString();
          }
          axiosWithAuth()
          .post('https://lambda-treasure-hunt.herokuapp.com/api/adv/move/', body)
          .then(res => {
            console.log('INIT response ', res.data)
            currentRoom = res.data.room_id;
            graph[vertex['room']][vertex.direction] = currentRoom;
            if (graph.hasOwnProperty(currentRoom)) {
              graph[currentRoom][directions[vertex['direction']]] = vertex.room;
            } else {
              graph[currentRoom] = {};
              graph[currentRoom][directions[vertex['direction']]] = vertex.room;
            }
            roomsInfo[currentRoom] = res.data;

            if (res.data.title.toLowerCase().search(new RegExp('shop')) !== -1) {
              importantRooms[res.data.title] = res.data.room_id;
            }
            if (res.data.title.toLowerCase().search(new RegExp('name')) !== -1) {
              importantRooms[res.data.title] = res.data.room_id;
            }
            if (res.data.title.toLowerCase().search(new RegExp('shrine')) !== -1) {
              importantRooms[res.data.title] = res.data.room_id;
            }
            if (res.data.title.toLowerCase().search(new RegExp('rye')) !== -1) {
              importantRooms[res.data.title] = res.data.room_id;
            }
            if (res.data.title.toLowerCase().search(new RegExp('wishing')) !== -1) {
              importantRooms[res.data.title] = res.data.room_id;
            }

            cooldown = res.data.cooldown * 1000;
            let exits = res.data.exits;
            for (let i = 0; i < exits.length; i++) {
              if (!graph[currentRoom].hasOwnProperty(exits[i])) {
                stack.push({'room': currentRoom, 'direction': exits[i], 'wise_explorer': false});
              }
            }

            if (res.data.items.length > 0) {
              for (let i = 0; i < res.data.items.length; i++) {
                let string = res.data.items[i];
                if (string.toLowerCase().search(new RegExp('treasure')) !== -1) {
                  items.push(res.data.items[i]);
                }
                // if (string.toLowerCase().search(new RegExp('name')) !== -1) {
                //   items.push(res.data.items[i]);
                // }
              }
            }
            //if we got treasure, pick up the treasure first, otherwise move on
            if (items.length > 0) {
              setTimeout(() => {

                let treasure = items.pop();

                //first check the status to make sure you can pick up the item
                axiosWithAuth()
                .post('https://lambda-treasure-hunt.herokuapp.com/api/adv/status/')
                .then(res => {
                  //add returned cooldown to the existing cooldown 
                  cooldown = res.data.cooldown * 1000
  
                  //if we can pick up the item, pick it up
                  if (res.data.encumbrance < 8) {
                    setTimeout(() => {
                      axiosWithAuth()
                      .post('https://lambda-treasure-hunt.herokuapp.com/api/adv/take/', {"name":`${treasure}`})
                      .then(res => {
                        //add returned cooldown to existing cooldown
                        cooldown = res.data.cooldown * 1000;
                        //wait and then move on
                        setTimeout(() => {
                          loop();
                        }, cooldown)
    
                      })
                      .catch(err => {
                          cooldown -= res.data.cooldown * 1000;
                          console.log('ERROR TREASURE', err)
                          setTimeout(() => {
                            loop();
                          }, cooldown)
                      })
                    }, cooldown)
                  } 
                  //can't pick up the item, move on
                  else {
                    setTimeout(() => {
                      loop();
                    }, cooldown)
                  }
                })
            
                .catch(err => {
                    console.log(err)
                })
                
              }, cooldown)

            } 
            //no treasure in the room, move on
            else {
              setTimeout(() => {
                loop()
              }, cooldown)
            }

          })
          .catch(err => {
              console.log(err)
          })
        } 
        //means we need to find a path back
        else {
          let queue = [[{'room':currentRoom, 'wise_explorer': undefined}]];
          let visited = {};

          while(queue.length > 0) {
            let path = queue.shift();
            let node = path[path.length -1]['wise_explorer'] !== undefined ? path[path.length -1]['wise_explorer'] : path[path.length -1]['room'];

            if (!visited.hasOwnProperty(node)) {
              visited[node] = 1;
              if (node === vertex.room) {
                //return path
                console.log('RETURN PATH: ', path)
                for (let i = path.length - 1; i > 0; i--) {
                  stack.push(path[i]);
                  console.log('PUSH TO STACK: ', path[i])
                }
                queue = [];
              } else {
                for (let key in graph[node]) {
                  let newPath = path.slice();
                  newPath.push({'room': node, 'direction': key, 'wise_explorer': graph[node][key]});
                  queue.unshift(newPath);
                }
              }
            }
          }
          loop();
        }

      } else {
        console.log('FINISHED, save to local storage')
        let g = [graph]
        let r = [roomsInfo]
        let i = [importantRooms]
        localStorage.setItem('roomsGraph', JSON.stringify(g))
        localStorage.setItem('roomsInfo', JSON.stringify(r))
        localStorage.setItem('importantRooms', JSON.stringify(i))
      }
    } else {

    }
      
    }
    loop();
  }

  return (
    <div className="App">
      <header className="App-header">
      </header>
    </div>
  );
}

export default App;
