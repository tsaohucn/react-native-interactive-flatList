import React, { Component } from 'react'
import PropTypes from 'prop-types'
import {
  View,
  StyleSheet,
  PanResponder,
  Platform,
  Animated,
  Easing,
  FlatList,
  Image,
  Dimensions,
  Button,
  InteractionManager
} from 'react-native'

const { width, height } = Dimensions.get('window')

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList)

export default class ComicBook extends Component {

  static propTypes = {
    ...View.propTypes,
    scalable: PropTypes.bool,
    content: PropTypes.array
  }

  static defaultProps = {
    scalable: true,
    content: new Array
  }

  constructor(props) {
    super(props)
    // 滾動
    this.state = {
      isScrollEnabled: true
    }
    // Never Flag
    this.isNeverPinch = true
    this.isNeverTranslate = true
    this.isNeverSingleRelease = true
    this.isNeverPanResponderMove = true
    this.isNeverScaleSmall = true
    this.isNeverCountClick = true
    this.isNeverFingerTranslate = true
    // 縮放
    this.lastDistance = null
    this.focusPointX = 0 // 關注點Ｘ
    this.focusPointY = 0 // 關注點Ｙ
    this.animatedScale = new Animated.Value(1)
    this.animatedoffsetX = new Animated.Value(0)
    this.animatedoffsetY = new Animated.Value(0)
    // 平移
    this.lastTranslateMoveX = null
    this.lastTranslateMoveY = null
    this.lastTranslateX = 0
    this.lastTranslateY = 0
    // 單擊 雙擊
    this.clickCount = 0
    this.singleFingerStayCount = 0
    this.clickX = null
    this.clickY = null
    this.singleClickX = null
    this.singleClickY = null
    this.scrollOffset = 0
    this.contentSize = null
  }

  UNSAFE_componentWillMount() {
    this.gestureHandlers = PanResponder.create({
      // Handler
      onPanResponderGrant: this._handlePanResponderGrant,
      onPanResponderMove: this._handlePanResponderMove,
      onPanResponderRelease: this._onPanResponderRelease,
      onResponderTerminate : this._handlePanResponderTerminate,
      // Setter
      onStartShouldSetPanResponder: evt => true, // 開始觸碰，是否成為響應者
      onMoveShouldSetPanResponder: evt => true, // 開始移動，是否成為響應者
      onStartShouldSetPanResponderCapture: evt => true, // 開始觸碰，是否捕捉成為響應者
      onMoveShouldSetPanResponderCapture: evt => true,  // 開始移動，是否捕捉成為響應者
      onPanResponderTerminationRequest: evt => true, // 有其他響應者，是否釋放響應權
      onShouldBlockNativeResponder: evt => true // 返回一個布爾值，決定當前組件是否應該阻止原生組件成為JS響應者，默認返回true。目前暫時只支持android
    })
  }

  _handlePanResponderGrant = (e, gestureState) => { 
    if (e.nativeEvent.touches) {
      this.clickX = e.nativeEvent.touches[0].pageX
      this.clickY = e.nativeEvent.touches[0].pageY
    }
  }

  _handlePanResponderMove = (e, gestureState) => {
    this.isNeverPanResponderMove = false
    if (gestureState.numberActiveTouches === 2) {
      // 計算放大倍數 // 縮放時屏蔽滾動
      const dx = Math.abs(e.nativeEvent.touches[0].pageX - e.nativeEvent.touches[1].pageX)
      const dy = Math.abs(e.nativeEvent.touches[0].pageY - e.nativeEvent.touches[1].pageY)
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (!this.lastDistance) {
        this.setState({isScrollEnabled: false})
        this.lastDistance = distance // 第一次lastDistance不存在給予把第一次的distance當作lastDistance
      }
      const scale = (1+(distance - this.lastDistance)/this.lastDistance)*this.animatedScale._value
      this.lastDistance = distance
      if (scale > 3) {
        scale = 3
      } else if (scale < 1) {
        this.isNeverScaleSmall = false
        if (scale < 0.5) {
          scale = 0.5
        }
      }
      // 計算偏移距離
      if (this.isNeverPinch) { 
        // 新一次雙手觸摸鎖定關注點 // 放大到縮小重置縮放 // 如果單手離開螢幕也算重置縮放
        this.focusPointX = ((e.nativeEvent.touches[0].pageX + e.nativeEvent.touches[1].pageX)/2 - width/2)/this.animatedScale._value - this.animatedoffsetX._value
        this.focusPointY = ((e.nativeEvent.touches[0].pageY + e.nativeEvent.touches[1].pageY)/2 - height/2)/this.animatedScale._value - this.animatedoffsetY._value
        this.isNeverPinch = false // 第一次縮放？
      }
      const magnifierCenterX = (e.nativeEvent.touches[0].pageX + e.nativeEvent.touches[1].pageX)/2 - width/2 // 目前雙手中心
      const magnifierCenterY = (e.nativeEvent.touches[0].pageY + e.nativeEvent.touches[1].pageY)/2 - height/2 // 目前雙手中心
      const offsetX = magnifierCenterX/scale-this.focusPointX // 關注點到雙手中心需要的偏移量
      const offsetY = magnifierCenterY/scale-this.focusPointY // 關注點到雙手中心需要的偏移量 
      if (scale >= 1 && this.isNeverScaleSmall) { 
        // 限制放大超過邊界時的偏移速度
        const offsetBoundaryX = (scale*width/2-width/2)/scale
        const offsetBoundaryY = (scale*height/2-height/2)/scale
        offsetX = Math.abs(offsetX) >= offsetBoundaryX ? offsetBoundaryX*Math.sign(offsetX) + ((offsetX - offsetBoundaryX*Math.sign(offsetX))/scale) : offsetX
        offsetY = Math.abs(offsetY) >= offsetBoundaryY ? offsetBoundaryY*Math.sign(offsetY) + ((offsetY - offsetBoundaryY*Math.sign(offsetY))/(scale*1.5)) : offsetY
      }
      this._animation(offsetX,offsetY,scale,12)
      
    } else if (gestureState.numberActiveTouches === 1) {
      if (gestureState.dx === 0 && gestureState.dy === 0) {
        this.singleFingerStayCount += 1 // 單手停留
      } else {
        this.isNeverFingerTranslate = false // 移動過
      }
      if (!this.isNeverPinch && this.isNeverSingleRelease) {
        this.isNeverSingleRelease = false
        this._onPanResponderSingleRelease()
      } else if (this.animatedScale._value > 1 && Math.abs(gestureState.dx) > 0 && this.isNeverSingleRelease && this.isNeverPinch) {
        // 要平移一定要先放大 再釋放單手或雙手 平移 ? 要在動畫完成後才平移？
        if (this.isNeverTranslate) { // 第一次平移觸摸時平移量
          this.lastTranslateX = this.animatedoffsetX._value
          this.lastTranslateY = this.animatedoffsetY._value
          this.lastTranslateMoveX = gestureState.dx
          this.lastTranslateMoveY = gestureState.dy
          this.isNeverTranslate = false
        }
        const offsetBoundaryX = (this.animatedScale._value*width/2-width/2)/this.animatedScale._value
        const offsetBoundaryY = (this.animatedScale._value*height/2-height/2)/this.animatedScale._value
        const offsetX = this.lastTranslateX + (gestureState.dx - this.lastTranslateMoveX)/2
        const offsetY = this.lastTranslateY + (gestureState.dy - this.lastTranslateMoveY)/2
        offsetX = Math.abs(offsetX) >= offsetBoundaryX ? offsetBoundaryX*Math.sign(offsetX) + ((offsetX - offsetBoundaryX*Math.sign(offsetX))/this.animatedScale._value) : offsetX
        offsetY = Math.abs(offsetY) >= offsetBoundaryY ? offsetBoundaryY*Math.sign(offsetY) + ((offsetY - offsetBoundaryY*Math.sign(offsetY))/(this.animatedScale._value*1.5)) : offsetY
        this.animatedoffsetX.setValue(offsetX)
        this.animatedoffsetY.setValue(offsetY)        
      }
      
    }
   
  }
  
  // 全部釋放
  _onPanResponderRelease =  async (e, gestureState) => {
    if (this.isNeverPanResponderMove || (this.singleFingerStayCount === 1 && this.isNeverFingerTranslate)) {   
      this.isNeverPanResponderMove = true
      this.isNeverFingerTranslate = true
      this.singleFingerStayCount = 0
      if (this.isNeverCountClick) {
        this.isNeverCountClick = false // 如果是時間區間第一次點擊則屏蔽後面點擊
        this.singleClickX = this.clickX
        this.singleClickY = this.clickY
        await this._sleep(200)
        if (this.clickCount > 0) {
          this.isNeverCountClick = true
          this.clickCount = 0
          this._handleDoubleClick(this.singleClickX,this.singleClickY)
        } else {
          this.isNeverCountClick = true
          this.clickCount = 0
          this._handleSingleClick(this.singleClickY)
        }
      } else {
        const dx = this.clickX - this.singleClickX
        const dy = this.clickY - this.singleClickY
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance < 100) {
          this.clickCount += 1
        }        
      }
    } else {
      // 滑動 縮放 釋放
      this.isNeverPanResponderMove = true
      this.isNeverFingerTranslate = true
      this.singleFingerStayCount = 0
      if (this.animatedScale._value > 2) {
        this._bigSpringBack(2,this._onPanResponderReleaseResetFlag)
      } else if (this.animatedScale._value >= 1 && this.animatedScale._value <= 2) {
        this._middleSpringBack(null,this._onPanResponderReleaseResetFlag)
      } else if (this.animatedScale._value < 1) {
        this._smallSpringBack(1,this._onPanResponderReleaseResetFlagSmall)
      }      
    }
  }

  // 單手釋放
  _onPanResponderSingleRelease = () => {
    if (this.animatedScale._value > 2) {
      this._bigSpringBack(2,this._onPanResponderSingleReleaseResetFlag)
    } else if (this.animatedScale._value > 1 && this.animatedScale._value <= 2) {
      this._middleSpringBack(null,this._onPanResponderSingleReleaseResetFlag)
    } else if (this.animatedScale._value <= 1) {
      this._smallSpringBack(1,this._onPanResponderSingleReleaseResetFlagSmall)
    }
  }

  _handlePanResponderTerminate =  (e, gestureState) => {
    //console.warn('意外取消')
  }

  _bigSpringBack = (scaleValue,doneCallBack) => {
    Animated.parallel([
      Animated.timing(this.animatedoffsetX,{
        toValue: this._springHideBlackBlock(scaleValue).offsetX,
        duration: 200
      }),
      Animated.timing(this.animatedoffsetY,{
        toValue: this._springHideBlackBlock(scaleValue).offsetY,
        duration: 200
      }),
      Animated.timing(this.animatedScale,{
        toValue: scaleValue,
        duration: 200
      })
    ]).start(doneCallBack)
  }

  _middleSpringBack = (scaleValue,doneCallBack) => {
    Animated.parallel([
      Animated.timing(this.animatedoffsetX,{
        toValue: this._springHideBlackBlock(this.animatedScale._value).offsetX,
        duration: 200
      }),
      Animated.timing(this.animatedoffsetY,{
        toValue: this._springHideBlackBlock(this.animatedScale._value).offsetY,
        duration: 200
      })
    ]).start(doneCallBack)
  }

  _smallSpringBack = (scaleValue,doneCallBack) => {
    // 暫時修復BUG用，滾回原本位置
    this.flatlist.getNode().scrollToOffset({
      offset: this.scrollOffset,
      animated: true,
    })
    Animated.parallel([
      Animated.timing(this.animatedScale,{
        toValue: scaleValue,
        duration: 200,
      }),
      Animated.timing(this.animatedoffsetX,{
        toValue: 0,
        duration: 200,
      }),
      Animated.timing(this.animatedoffsetY,{
        toValue: 0,
        duration: 200,
      })
    ]).start(doneCallBack)
  }
  
  _animation = (offsetX,offsetY,scale) => {
    this.animatedoffsetX.setValue(offsetX)
    this.animatedoffsetY.setValue(offsetY)
    this.animatedScale.setValue(scale)   
  }

  _springHideBlackBlock = scale => {
    const offsetBoundaryX = (scale*width/2-width/2)/scale
    const offsetBoundaryY = (scale*height/2-height/2)/scale
    let offsetX = this.animatedoffsetX._value
    let offsetY = this.animatedoffsetY._value
    if (Math.abs(this.animatedoffsetX._value) > offsetBoundaryX) {
      offsetX = offsetBoundaryX*Math.sign(this.animatedoffsetX._value)
    }
    if (Math.abs(this.animatedoffsetY._value) > offsetBoundaryY) {
      offsetY = offsetBoundaryY*Math.sign(this.animatedoffsetY._value)
    }
    return {offsetX,offsetY}
  }

  _onPanResponderReleaseResetFlagSmall = () => {
    this.setState({isScrollEnabled: true})
    this._onPanResponderReleaseResetFlag()
  }

  _onPanResponderReleaseResetFlag = () => {
    this.isNeverScaleSmall = true
    this._resetFlag()
  }

  _onPanResponderSingleReleaseResetFlagSmall = () => {
    this.setState({isScrollEnabled: true})
    this._onPanResponderSingleReleaseResetFlag()
  }


  _onPanResponderSingleReleaseResetFlag = () => {
    this._resetFlag()
  }

  _resetFlag = () => {
    this.isNeverPinch = true
    this.isNeverTranslate = true
    this.isNeverSingleRelease = true
    this.lastDistance = null
  }

  _handleSingleClick = (pageY) => {
    if (pageY <= height/3) {
      const offsetY = (this.scrollOffset - height/3)
      if (offsetY < 0) {
        offsetY = 0
      }
      this.flatlist.getNode().scrollToOffset({
        offset: offsetY ,
        animated: true,
      })
    } else if (pageY > height/3 && pageY < height*2/3) {
      //console.warn('選單')
    } else {
      const offsetY = (this.scrollOffset + height/3)
      if (this.contentSize) {
        if (offsetY > this.contentSize) {
          offsetY = this.contentSize
        }
      }
      this.flatlist.getNode().scrollToOffset({
        offset: offsetY ,
        animated: true,
      })
    }
  }

  _handleDoubleClick = (pageX,pageY) => {
    if (this.animatedScale._value > 1) { 
      Animated.parallel([
        Animated.timing(this.animatedoffsetX,{
          toValue: 0,
          duration: 200
        }),
        Animated.timing(this.animatedoffsetY,{
          toValue: 0,
          duration: 200
        }),
        Animated.timing(this.animatedScale,{
          toValue: 1,
          duration: 200
        })
      ]).start(() => {
        this.setState({isScrollEnabled: true})
        this._resetFlag()
      })
    } else if (this.animatedScale._value === 1) { 
      const focusPointX = (pageX - width/2)
      const focusPointY = (pageY - height/2)
      const offsetX = focusPointX/2-focusPointX // 關注點到雙手中心需要的偏移量
      const offsetY = focusPointY/2-focusPointY // 關注點到雙手中心需要的偏移量         
      Animated.parallel([
        Animated.timing(this.animatedoffsetX,{
          toValue: offsetX,
          duration: 200
        }),
        Animated.timing(this.animatedoffsetY,{
          toValue: offsetY,
          duration: 200
        }),
        Animated.timing(this.animatedScale,{
          toValue: 2,
          duration: 200
        })
      ]).start(() => {
        this._resetFlag()
      })
    }    
  }

  _sleep = ms => {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  _onScroll = ({nativeEvent}) => {
    //const {layoutMeasurement, scrollY, contentSize,contentOffset} = nativeEvent
    this.scrollOffset = nativeEvent.contentOffset.y
    this.contentSize = nativeEvent.contentSize.height - nativeEvent.layoutMeasurement.height
  }

  render() {
    return (
      <AnimatedFlatList
        {...this.gestureHandlers.panHandlers}
        style={[styles.animatedFlatList,{
          transform: [
            {scaleX: this.animatedScale},
            {scaleY: this.animatedScale},
            {translateX: this.animatedoffsetX},
            {translateY: this.animatedoffsetY}
          ]
        }]}
        contentContainerStyle={styles.contentContainerStyle}
        ref={ref => this.flatlist = ref}
        removeClippedSubviews
        onEndReachedThreshold={0.1}
        data={this.props.content}
        numColumns={1}
        scrollEnabled={this.state.isScrollEnabled}
        showsVerticalScrollIndicator={false}
        horizontal={false}
        onScroll={this._onScroll}
        renderItem={({ item }) =>
          <Image
            resizeMode={'contain'} 
            style={{width, height: item.height, backgroundColor: 'black'}}
            source={{uri: item.key}}
            />
          }
      />
    )
  }
}

const styles = StyleSheet.create({
  animatedFlatList: {
    //
  },
  contentContainerStyle: {
    //justifyContent: 'center',
    //alignItems: 'center'
  }}
)