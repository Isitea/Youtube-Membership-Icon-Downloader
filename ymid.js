import JSZip from 'https://esm.sh/jszip'

async function checkDOM ( selector, n = 0 ) {
    let result;

    if ( document.querySelectorAll( selector ).length > n ) {
        result = document.querySelectorAll( selector )
    }
    else {
        await sleep();
        result = checkDOM( selector );
    }

    return result
}

function sleep ( s = 500 ) {
    return new Promise( res => setTimeout( res, s ) );
}

async function specifyPerks () {
    let [action] = await checkDOM( "#sponsor-button button[aria-label*=Join], #contents button[aria-label*=perks]" );
    action.click()
    await sleep();
    let perks = [ ...await checkDOM( "ytd-sponsorships-perk-renderer img", 4 ) ];
    for ( let node of perks ) {
        node.scrollIntoView();
        await sleep( 10 );
    }

    return perks
}

async function fetchPerks ( perks, namer ) {
    let fetches = perks.reduce( ( result, node, index ) => ( { ...result, [ namer(node, index) ]: fetch( node.src ).then( res => res.blob() ) } ), {} );
    for ( let [ key, value ] of Object.entries( fetches ) ) {
        fetches[key] = await value
    }
    
    return fetches
}

async function getPerks ( perks ) {
    perks = perks.map( node => ( { alt: node.alt, src: node.src.replace( /=(w\d+.+?|s\d+.+?)-k-nd/, '=s4096-k-nd' ) } ) );
    let [ badges, emojis ] = await Promise.all( [ fetchPerks( perks.filter( node => ( node.alt.includes( "badge" ) || node.alt == "" ) ), ( node, index ) => index.toString().padStart( 2, "0" ) ), fetchPerks( perks.filter( node => ( !node.alt.includes( "badge" ) && node.alt != "" ) ), ( node, index ) => node.alt ) ] )

    return { badges, emojis }
}

function addFiles2Folder ( arch, folder, list ) {
    for ( let [ key, blob ] of Object.entries( list ) ) {
        arch = arch.file( `${ folder }/${ key }.${ blob.type.replace( /.+?\/(.+?)/, "$1" ) }`, blob )
    }
    return arch
}

async function makeArchive ( { badges, emojis } ) {
    let zip = new JSZip();
    zip = addFiles2Folder( zip, "badges", badges )
    zip = addFiles2Folder( zip, "emojis", emojis )

    return zip.generateAsync( { type: "blob" } );
}

specifyPerks()
    .then( getPerks )
    .then( makeArchive )
    .then( URL.createObjectURL )
    .then( url => {
        let Channel = 
            document.querySelector( "#primary #channel-name yt-formatted-string.ytd-channel-name[has-link-only_]" )?.textContent
            ||
            document.querySelector( "#channel-name #text.ytd-channel-name" )?.textContent
        
        let link = document.createElement( "a" );
        link.href = url;
        link.download = `${ Channel }.zip`
        link.click();
        console.log( `Downloading ${ Channel }.zip`)
    } )