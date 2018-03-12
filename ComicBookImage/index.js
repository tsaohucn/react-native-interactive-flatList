import React , { Component } from 'react'
import { View, Image, ActivityIndicator } from 'react-native'
import PropTypes from 'prop-types'

const styles = {
  view: {
    alignItems: 'center', 
  },
  image: {
    position: 'relative'
  },
  placeholder: {
    flex: 1,
    backgroundColor: 'blue',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute'
  },
  activityIndicator: {
    position: 'absolute',
    margin: 'auto',
    zIndex: 9,
  },
  placeholderImage: {
    resizeMode: 'contain',
    justifyContent: 'center',
    alignItems: 'center'
  }
}

export default class ComicBookImage extends Component {

  static propTypes = {
    isShowActivity: PropTypes.bool,
  }

  static defaultProps = {
    isShowActivity: true,
  }

  constructor(props) {
    super(props)
    this.state = {
      isLoaded: false,
      isError: false
    }
  }

  onError(){
    this.setState({
      isError: true
    })
  }

  onLoad(){
    this.setState({
      isLoaded: true
    })  
  }

  onLoadStart(){
    this.setState({
      isLoaded: false
    })    
  }

  render() {

    const { style, source, resizeMode, loadingStyle, placeholderSource } = this.props

    return(
      <View>
        <View style={styles.view}>
          <Image
            onError={this.onError.bind(this)}
            onLoad={this.onLoad.bind(this)}
            style={[styles.image, style]}
            source={source}
            resizeMode={resizeMode || 'contain'}
          />
          { !this.state.isLoaded &&
          <View 
            style={styles.placeholder}
          >
            {
              (this.props.isShowActivity && !this.state.isError) &&
              <ActivityIndicator
                style={styles.activityIndicator}
                size={loadingStyle ? loadingStyle.size : 'small'}
                color={loadingStyle ? loadingStyle.color : 'gray'}
              />
            }
            <Image
              style={[styles.placeholderImage, style]}
              source={placeholderSource}
            >
            </Image>
          </View>
          }
        </View>
      </View>
    );
  }
}