console.log('Script chargé.');


class MonPremierComposant extends React.Component {

    render() {
        return <p>React est bien chargé !</p>;
    }

}

ReactDOM.render( <MonPremierComposant></MonPremierComposant>, document.querySelector('#monPremierComposant') );
