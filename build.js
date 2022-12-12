import { Base64 } from 'js-base64';
import minify from '@node-minify/core';
import terser from '@node-minify/terser';
import * as fs from 'node:fs/promises';

Base64.extendString();

fs.open( './dist/ymid.js', 'r' )
    .then( handle => handle.readFile( { encoding: "utf-8" } ) )
    .then( content => minify( { compressor: terser, content } ) )
    .then( minified => minified.toBase64() )
    .then( base64 => `{ let s = document.createElement( "script" ); s.src = "data:text/javascript;base64,${ base64 }"; s.type = "module"; document.head.append( s ); }` )
    .then( activator => fs.open( './dist/activator.js', 'w' ).then( handle => handle.writeFile( activator ) ) )
    .catch( err => console.log( err ) )

